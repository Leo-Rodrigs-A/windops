import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Called only by the disposable database integration harness.
export async function verifyIssueQueries({ pool, app, ids, headers, membershipByUser }) {
  const workspace = ids.workspaceA;
  const parks = [randomUUID(), randomUUID()];
  const turbines = [randomUUID(), randomUUID()];
  for (let i = 0; i < 2; i++) {
    await pool.query('INSERT INTO parks(id, workspace_id, code) VALUES ($1,$2,$3)', [
      parks[i],
      workspace,
      `P90${i}`,
    ]);
    await pool.query(
      "INSERT INTO turbines(id, workspace_id, park_id, code) VALUES ($1,$2,$3,'T01')",
      [turbines[i], workspace, parks[i]],
    );
  }
  const fixture = [];
  for (let i = 0; i < 128; i++) {
    const group = i % 4;
    const status = ['pending', 'in_progress', 'completed', 'pending'][group];
    const location = Math.floor(i / 4) % 2;
    // Different orders and exact microsecond ties expose Date truncation in cursors.
    const created = `2026-01-${String(1 + Math.floor(i / 16)).padStart(2, '0')}T12:00:00.123456Z`;
    const updated = `2026-02-${String(20 - Math.floor(i / 16)).padStart(2, '0')}T12:00:00.654321Z`;
    const archived = group === 3 ? updated : null;
    const row = {
      id: randomUUID(),
      status,
      parkId: parks[location],
      turbineId: turbines[location],
      created,
      updated,
      archived,
    };
    fixture.push(row);
    await pool.query(
      `INSERT INTO issues(id,workspace_id,park_id,turbine_id,creator_membership_id,creator_user_id,text,status,handler_membership_id,handler_user_id,created_at,updated_at,archived_at)
      VALUES ($1,$2,$3,$4,$5,$6,'Q02 fixture',$7,$8,$9,$10,$11,$12)`,
      [
        row.id,
        workspace,
        row.parkId,
        row.turbineId,
        membershipByUser.get(ids.admin.id),
        ids.admin.id,
        status,
        status === 'pending' ? null : membershipByUser.get(ids.admin.id),
        status === 'pending' ? null : ids.admin.id,
        created,
        updated,
        archived,
      ],
    );
  }
  const root = `/api/workspaces/${workspace}/issues`;
  const request = (query, user = ids.admin, step = 'complete') =>
    app.inject({ url: `${root}?${new URLSearchParams(query)}`, headers: headers(user, step) });
  // Restrict to fixture parks; unfiltered reads also include earlier harness records.
  const snapshot = async () =>
    (
      await pool.query(
        `SELECT id,status,park_id AS "parkId",turbine_id AS "turbineId",created_at::text AS created,updated_at::text AS updated,archived_at::text AS archived FROM issues WHERE workspace_id=$1`,
        [workspace],
      )
    ).rows;
  const baseline = await snapshot();
  const counts = async () =>
    (
      await pool.query(
        `SELECT (SELECT count(*) FROM issue_events) events, (SELECT count(*) FROM sync_commands) receipts, (SELECT count(*) FROM notifications) notifications`,
      )
    ).rows;
  const beforeCounts = await counts();
  for (const status of ['active', 'pending', 'in_progress', 'completed', 'archived']) {
    for (const filter of [
      {},
      { parkId: parks[0] },
      { turbineId: turbines[1] },
      { parkId: parks[1], turbineId: turbines[1] },
      { parkId: parks[0], turbineId: turbines[1] },
      { parkId: randomUUID() },
    ]) {
      const field =
        status === 'completed' ? 'updated' : status === 'archived' ? 'archived' : 'created';
      const expected = baseline
        .filter(
          (row) =>
            (status === 'archived'
              ? row.archived
              : !row.archived &&
                (status === 'active' ? row.status !== 'completed' : row.status === status)) &&
            (!filter.parkId || row.parkId === filter.parkId) &&
            (!filter.turbineId || row.turbineId === filter.turbineId),
        )
        .sort((a, b) => b[field].localeCompare(a[field]) || b.id.localeCompare(a.id))
        .map((row) => row.id);
      const found = [];
      let cursor;
      do {
        const response = await request({ status, ...filter, ...(cursor ? { cursor } : {}) });
        assert.equal(response.statusCode, 200, response.body);
        const page = response.json();
        assert.ok(page.items.length <= 25);
        found.push(...page.items.map((row) => row.id));
        cursor = page.nextCursor;
        assert.ok(found.length <= expected.length, 'Pagination must terminate without duplicates');
      } while (cursor);
      assert.deepEqual(found, expected, JSON.stringify({ status, ...filter }));
    }
  }
  assert.deepEqual(await snapshot(), baseline, 'GETs must not modify issues');
  assert.deepEqual(await counts(), beforeCounts);

  for (const [status, mutation] of [
    ['in_progress', "status='completed'"],
    ['pending', 'archived_at=clock_timestamp()'],
    ['completed', "status='pending',handler_membership_id=NULL,handler_user_id=NULL"],
    ['active', `park_id='${parks[1]}',turbine_id='${turbines[1]}'`],
  ]) {
    const query = { status, parkId: parks[0], limit: '2' };
    const first = (await request(query)).json();
    assert.ok(first.nextCursor);
    await pool.query(`UPDATE issues SET ${mutation},revision=revision+1 WHERE id=$1`, [
      first.nextCursor,
    ]);
    const response = await request({ ...query, cursor: first.nextCursor });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_CURSOR');
    assert.equal((await request(query)).statusCode, 200);
  }
  const first = (await request({ status: 'active', limit: '2' })).json();
  assert.ok(first.nextCursor);
  for (const [user, step, expected] of [
    [ids.other, 'complete', 403],
    [ids.admin, 'pending', 401],
  ])
    assert.equal((await request({ cursor: first.nextCursor }, user, step)).statusCode, expected);
  const foreign = (
    await pool.query('SELECT id,park_id,turbine_id FROM issues WHERE workspace_id=$1 LIMIT 1', [
      ids.workspaceB,
    ])
  ).rows[0];
  for (const cursor of [foreign.id, randomUUID()]) {
    const response = await request({ cursor });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_CURSOR');
  }
  assert.deepEqual(
    (await request({ parkId: foreign.park_id, turbineId: foreign.turbine_id })).json(),
    { items: [], nextCursor: null },
  );
  await pool.query(
    'UPDATE workspace_members SET revoked_at=clock_timestamp() WHERE workspace_id=$1 AND user_id=$2',
    [workspace, ids.tech.id],
  );
  assert.equal((await request({ cursor: first.nextCursor }, ids.tech)).statusCode, 403);
  await pool.query(
    'UPDATE workspace_members SET revoked_at=NULL WHERE workspace_id=$1 AND user_id=$2',
    [workspace, ids.tech.id],
  );

  // A newly inserted head is visible on refresh, not in continuation of an older page.
  const newest = randomUUID();
  await pool.query(
    `INSERT INTO issues(id,workspace_id,park_id,turbine_id,creator_membership_id,creator_user_id,text,created_at) VALUES ($1,$2,$3,$4,$5,$6,'New head','2099-01-01')`,
    [newest, workspace, parks[0], turbines[0], membershipByUser.get(ids.admin.id), ids.admin.id],
  );
  const continued = (await request({ status: 'active', cursor: first.nextCursor })).json();
  assert.ok(!continued.items.some((row) => row.id === newest));
  assert.equal((await request({ status: 'active' })).json().items[0].id, newest);
  for (const status of ['active', 'completed', 'archived']) {
    // Capture the actual service query plan, including its CASE and tenant filters.
    const original = pool.query.bind(pool);
    const plans = [];
    pool.query = async (sql, values) => {
      if (
        typeof sql === 'string' &&
        sql.includes('FROM public.issues i') &&
        sql.includes('ORDER BY')
      )
        plans.push(
          (await original(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, values)).rows[0][
            'QUERY PLAN'
          ][0],
        );
      return original(sql, values);
    };
    try {
      assert.equal((await request({ status, parkId: parks[0] })).statusCode, 200);
    } finally {
      pool.query = original;
    }
    assert.equal(plans.length, 1);
    console.log(`Q02 plan ${status}: ${JSON.stringify(plans[0])}`);
  }
  console.log(
    'Q02: 128 fixtures, filters, pagination, microseconds, invalidation, authorization and concurrent insertion verified.',
  );
}
