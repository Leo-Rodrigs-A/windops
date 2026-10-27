import { z } from 'zod';
export const healthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('windops-api'),
});
export const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
});
export type Health = z.infer<typeof healthSchema>;
export type ApiError = z.infer<typeof errorSchema>;

export const workspaceRoleSchema = z.enum(['admin', 'technician']);
export const authenticatedUserSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
  })
  .strict();
export const authorizedWorkspaceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  role: workspaceRoleSchema,
});
export const meSchema = z.object({
  user: authenticatedUserSchema,
  workspaces: z.array(authorizedWorkspaceSchema),
});
export const workspaceContextSchema = z.object({
  workspace: z.object({ id: z.uuid(), name: z.string().min(1) }),
  role: workspaceRoleSchema,
});
export const authProvidersSchema = z.object({ google: z.boolean() });

export const workspaceInvitationDeliveryStatusSchema = z.enum(['pending', 'sent', 'failed']);
export const workspaceInvitationStatusSchema = z.enum([
  'pending',
  'expired',
  'accepted',
  'revoked',
  'superseded',
  'delivery_failed',
]);
export const workspaceInvitationSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    role: workspaceRoleSchema,
    status: workspaceInvitationStatusSchema,
    deliveryStatus: workspaceInvitationDeliveryStatusSchema,
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    sentAt: z.iso.datetime().nullable(),
  })
  .strict();
export const workspaceInvitationsPageSchema = z.object({
  items: z.array(workspaceInvitationSchema),
  nextCursor: z.uuid().nullable(),
});
export const workspaceListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.uuid().optional(),
    search: z.string().trim().min(1).max(320).optional(),
  })
  .strict();
export const workspaceMembersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.uuid().optional(),
    search: z.string().trim().min(1).max(320).optional(),
  })
  .strict();
export const createWorkspaceInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    role: workspaceRoleSchema.default('technician'),
  })
  .strict();
export const acceptWorkspaceInvitationSchema = z
  .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();
export const updateWorkspaceMemberRoleSchema = z
  .object({ role: workspaceRoleSchema, expectedRevision: z.number().int().positive() })
  .strict();
export const revokeWorkspaceMemberSchema = z
  .object({ expectedRevision: z.number().int().positive() })
  .strict();
export const workspaceMemberMutationSchema = z
  .object({
    membershipId: z.uuid(),
    role: workspaceRoleSchema,
    revokedAt: z.iso.datetime().nullable(),
    revision: z.number().int().positive(),
  })
  .strict();
export const workspaceMemberSchema = z
  .object({
    membershipId: z.uuid(),
    user: authenticatedUserSchema,
    role: workspaceRoleSchema,
    createdAt: z.iso.datetime(),
    revokedAt: z.iso.datetime().nullable(),
    revision: z.number().int().positive(),
  })
  .strict();
export const workspaceMembersPageSchema = z
  .object({
    items: z.array(workspaceMemberSchema),
    nextCursor: z.uuid().nullable(),
    activeAdminCount: z.number().int().nonnegative(),
  })
  .strict();
export const workspaceDirectoryAccountSchema = z
  .object({
    ...authenticatedUserSchema.shape,
    createdAt: z.iso.datetime(),
  })
  .strict();
export const workspaceDirectoryPageSchema = z
  .object({
    items: z.array(workspaceDirectoryAccountSchema),
    nextCursor: z.uuid().nullable(),
  })
  .strict();

const catalogCodeSchema = (prefix: 'P' | 'T') =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(new RegExp(`^${prefix}[0-9]{2,6}$`), `Use o formato ${prefix}01.`);

export const parkSchema = z
  .object({
    id: z.uuid(),
    workspaceId: z.uuid(),
    code: catalogCodeSchema('P'),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    revision: z.number().int().positive(),
    deactivatedAt: z.iso.datetime().nullable(),
  })
  .strict();
export const turbineSchema = z
  .object({
    id: z.uuid(),
    workspaceId: z.uuid(),
    parkId: z.uuid(),
    code: catalogCodeSchema('T'),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    revision: z.number().int().positive(),
    deactivatedAt: z.iso.datetime().nullable(),
  })
  .strict();
export const parkParamsSchema = z.object({ parkId: z.uuid() }).strict();
export const turbineParamsSchema = z.object({ parkId: z.uuid(), turbineId: z.uuid() }).strict();
export const parksQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.uuid().optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
export const turbinesQuerySchema = parksQuerySchema;
export const createParkSchema = z.object({ code: catalogCodeSchema('P') }).strict();
export const updateParkSchema = z
  .object({ code: catalogCodeSchema('P'), expectedRevision: z.number().int().positive() })
  .strict();
export const createTurbineSchema = z.object({ code: catalogCodeSchema('T') }).strict();
export const updateTurbineSchema = z
  .object({ code: catalogCodeSchema('T'), expectedRevision: z.number().int().positive() })
  .strict();
export const equipmentLifecycleCommandSchema = z
  .object({ commandId: z.uuid(), expectedRevision: z.number().int().positive() })
  .strict();
export const deletedParkSchema = z
  .object({
    result: z.literal('deleted'),
    id: z.uuid(),
    workspaceId: z.uuid(),
    code: catalogCodeSchema('P'),
  })
  .strict();
export const archivedParkSchema = z
  .object({ result: z.literal('archived'), park: parkSchema })
  .strict();
export const restoredParkSchema = z
  .object({ result: z.literal('restored'), park: parkSchema })
  .strict();
export const parkLifecycleResultSchema = z.discriminatedUnion('result', [
  deletedParkSchema,
  archivedParkSchema,
  restoredParkSchema,
]);
export const deletedTurbineSchema = z
  .object({
    result: z.literal('deleted'),
    id: z.uuid(),
    workspaceId: z.uuid(),
    parkId: z.uuid(),
    code: catalogCodeSchema('T'),
  })
  .strict();
export const archivedTurbineSchema = z
  .object({ result: z.literal('archived'), turbine: turbineSchema })
  .strict();
export const restoredTurbineSchema = z
  .object({ result: z.literal('restored'), turbine: turbineSchema })
  .strict();
export const turbineLifecycleResultSchema = z.discriminatedUnion('result', [
  deletedTurbineSchema,
  archivedTurbineSchema,
  restoredTurbineSchema,
]);
export const parksPageSchema = z
  .object({ items: z.array(parkSchema), nextCursor: z.uuid().nullable() })
  .strict();
export const turbinesPageSchema = z
  .object({ items: z.array(turbineSchema), nextCursor: z.uuid().nullable() })
  .strict();

export const issueStatusSchema = z.enum(['pending', 'in_progress']);
export const issueEventTypeSchema = z.enum([
  'created',
  'edited',
  'started',
  'returned',
  'released',
]);
export const issueLocationSchema = z.object({ parkId: z.uuid(), turbineId: z.uuid() }).strict();
const issueTextSchema = z.string().trim().min(1).max(10_000);
export const issueSchema = z
  .object({
    id: z.uuid(),
    workspaceId: z.uuid(),
    parkId: z.uuid(),
    turbineId: z.uuid(),
    creatorMembershipId: z.uuid(),
    creator: authenticatedUserSchema,
    handlerMembershipId: z.uuid().nullable(),
    handler: authenticatedUserSchema.nullable(),
    text: issueTextSchema,
    status: issueStatusSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    revision: z.number().int().positive(),
  })
  .strict();
export const issueEventSchema = z
  .object({
    id: z.uuid(),
    issueId: z.uuid(),
    workspaceId: z.uuid(),
    actorMembershipId: z.uuid().nullable(),
    actorLabel: z.string().min(1),
    type: issueEventTypeSchema,
    occurredAt: z.iso.datetime(),
    before: z.record(z.string(), z.unknown()).nullable(),
    after: z.record(z.string(), z.unknown()).nullable(),
  })
  .strict();
export const issueEventPageSchema = z
  .object({ items: z.array(issueEventSchema), nextCursor: z.uuid().nullable() })
  .strict();
export const issuesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.uuid().optional(),
    status: issueStatusSchema.optional(),
    parkId: z.uuid().optional(),
    turbineId: z.uuid().optional(),
  })
  .strict();
export const issueEventQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.uuid().optional(),
  })
  .strict();
export const issueParamsSchema = z.object({ issueId: z.uuid() }).strict();
export const issuesPageSchema = z
  .object({ items: z.array(issueSchema), nextCursor: z.uuid().nullable() })
  .strict();
export const createIssueSchema = z
  .object({
    commandId: z.uuid(),
    issueId: z.uuid(),
    ...issueLocationSchema.shape,
    text: issueTextSchema,
  })
  .strict();
export const updateIssueSchema = z
  .object({
    commandId: z.uuid(),
    expectedRevision: z.number().int().positive(),
    text: issueTextSchema.optional(),
    ...issueLocationSchema.partial().shape,
  })
  .strict()
  .refine(
    ({ text, parkId, turbineId }) =>
      (text !== undefined || (parkId !== undefined && turbineId !== undefined)) &&
      (parkId === undefined) === (turbineId === undefined),
    'Informe o texto ou a localização completa.',
  );
const issueActionSchema = z
  .object({ commandId: z.uuid(), expectedRevision: z.number().int().positive() })
  .strict();
export const startIssueSchema = issueActionSchema;
export const returnIssueSchema = issueActionSchema;
export const releaseIssueSchema = issueActionSchema;
export type IssueStatus = z.infer<typeof issueStatusSchema>;
export type IssueEventType = z.infer<typeof issueEventTypeSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type IssueEvent = z.infer<typeof issueEventSchema>;
export type IssuesQuery = z.infer<typeof issuesQuerySchema>;
export type IssueEventQuery = z.infer<typeof issueEventQuerySchema>;
export type IssuesPage = z.infer<typeof issuesPageSchema>;
export type IssueEventPage = z.infer<typeof issueEventPageSchema>;
export type CreateIssue = z.infer<typeof createIssueSchema>;
export type UpdateIssue = z.infer<typeof updateIssueSchema>;
export type StartIssue = z.infer<typeof startIssueSchema>;
export type ReturnIssue = z.infer<typeof returnIssueSchema>;
export type ReleaseIssue = z.infer<typeof releaseIssueSchema>;

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type AuthorizedWorkspace = z.infer<typeof authorizedWorkspaceSchema>;
export type Me = z.infer<typeof meSchema>;
export type WorkspaceContext = z.infer<typeof workspaceContextSchema>;
export type AuthProviders = z.infer<typeof authProvidersSchema>;
export type WorkspaceInvitation = z.infer<typeof workspaceInvitationSchema>;
export type WorkspaceInvitationDeliveryStatus = z.infer<
  typeof workspaceInvitationDeliveryStatusSchema
>;
export type WorkspaceInvitationStatus = z.infer<typeof workspaceInvitationStatusSchema>;
export type WorkspaceInvitationsPage = z.infer<typeof workspaceInvitationsPageSchema>;
export type CreateWorkspaceInvitation = z.infer<typeof createWorkspaceInvitationSchema>;
export type AcceptWorkspaceInvitation = z.infer<typeof acceptWorkspaceInvitationSchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceMemberMutation = z.infer<typeof workspaceMemberMutationSchema>;
export type WorkspaceMembersPage = z.infer<typeof workspaceMembersPageSchema>;
export type WorkspaceDirectoryAccount = z.infer<typeof workspaceDirectoryAccountSchema>;
export type WorkspaceDirectoryPage = z.infer<typeof workspaceDirectoryPageSchema>;
export type Park = z.infer<typeof parkSchema>;
export type Turbine = z.infer<typeof turbineSchema>;
export type ParksQuery = z.infer<typeof parksQuerySchema>;
export type TurbinesQuery = z.infer<typeof turbinesQuerySchema>;
export type CreatePark = z.infer<typeof createParkSchema>;
export type UpdatePark = z.infer<typeof updateParkSchema>;
export type CreateTurbine = z.infer<typeof createTurbineSchema>;
export type UpdateTurbine = z.infer<typeof updateTurbineSchema>;
export type EquipmentLifecycleCommand = z.infer<typeof equipmentLifecycleCommandSchema>;
export type ParkLifecycleResult = z.infer<typeof parkLifecycleResultSchema>;
export type TurbineLifecycleResult = z.infer<typeof turbineLifecycleResultSchema>;
export type ParksPage = z.infer<typeof parksPageSchema>;
export type TurbinesPage = z.infer<typeof turbinesPageSchema>;
export type WorkspaceListQuery = z.infer<typeof workspaceListQuerySchema>;
export type WorkspaceMembersQuery = z.infer<typeof workspaceMembersQuerySchema>;
