import { type Park, parkSchema, type Turbine, turbineSchema } from '@windops/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../../lib/auth-api';
import { getPark, getParks, getParkTurbines } from '../../lib/workspace-api';
import type { LocalIssueStore } from '../../offline/local-issue-store';
import { getApiErrorMessage } from './model';

interface UseParksCatalogOptions {
  workspaceId: string;
  online: boolean;
  authenticated: boolean;
  store?: LocalIssueStore | null;
  refresh: () => Promise<unknown>;
}

export function useParksCatalog({
  workspaceId,
  online,
  authenticated,
  store,
  refresh,
}: UseParksCatalogOptions) {
  const [parks, setParks] = useState<Park[]>([]);
  const [parkCursor, setParkCursor] = useState<string | null>(null);
  const [parksSearch, setParksSearch] = useState('');
  const [parksLoading, setParksLoading] = useState(true);
  const [parksMoreLoading, setParksMoreLoading] = useState(false);
  const [parksError, setParksError] = useState('');
  const [selectedParkId, setSelectedParkId] = useState('');
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [turbines, setTurbines] = useState<Turbine[]>([]);
  const [turbineCursor, setTurbineCursor] = useState<string | null>(null);
  const [turbinesSearch, setTurbinesSearch] = useState('');
  const [turbinesLoading, setTurbinesLoading] = useState(false);
  const [turbinesMoreLoading, setTurbinesMoreLoading] = useState(false);
  const [turbinesError, setTurbinesError] = useState('');
  const parksRequest = useRef(0);
  const detailRequest = useRef(0);

  const cachedParks = useCallback(
    () =>
      (store?.listReplica('parks') ?? [])
        .map((row) => parkSchema.safeParse(row).data)
        .filter((park): park is Park => Boolean(park)),
    [store],
  );

  const cachedTurbines = useCallback(
    (parkId: string) =>
      (store?.listReplica('turbines') ?? [])
        .map((row) => turbineSchema.safeParse(row).data)
        .filter((turbine): turbine is Turbine => Boolean(turbine && turbine.parkId === parkId)),
    [store],
  );

  const loadParks = useCallback(
    async (search: string, cursor?: string, append = false) => {
      if (!workspaceId) return;
      const requestId = ++parksRequest.current;
      append ? setParksMoreLoading(true) : setParksLoading(true);
      setParksError('');
      try {
        if (!online || !authenticated) {
          const cached = cachedParks().filter((park) =>
            park.code.includes(search.trim().toUpperCase()),
          );
          setParks(cached);
          setParkCursor(null);
          setSelectedParkId((previous) => previous || cached[0]?.id || '');
          if (cached.length === 0)
            setParksError('Catálogo local indisponível. Conecte-se para carregar os parques.');
          return;
        }
        const page = await getParks(workspaceId, {
          limit: 25,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(cursor ? { cursor } : {}),
        });
        if (requestId !== parksRequest.current) return;
        setParks((previous) => (append ? [...previous, ...page.items] : page.items));
        setParkCursor(page.nextCursor);
        setSelectedParkId((previous) => {
          if (previous && (append || page.items.some((park) => park.id === previous)))
            return previous;
          return page.items[0]?.id ?? '';
        });
      } catch (error) {
        if (requestId !== parksRequest.current) return;
        const cached = cachedParks().filter((park) =>
          park.code.includes(search.trim().toUpperCase()),
        );
        if (cached.length) {
          setParks(cached);
          setParkCursor(null);
          setSelectedParkId((previous) => previous || cached[0]?.id || '');
          setParksError('Servidor indisponível; exibindo o catálogo salvo neste aparelho.');
        } else setParksError(getApiErrorMessage(error, 'carregar os parques'));
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      } finally {
        if (requestId === parksRequest.current) {
          setParksLoading(false);
          setParksMoreLoading(false);
        }
      }
    },
    [authenticated, cachedParks, online, refresh, workspaceId],
  );

  const loadParkDetail = useCallback(
    async (parkId: string, search: string, cursor?: string, append = false) => {
      if (!workspaceId || !parkId) {
        setSelectedPark(null);
        setTurbines([]);
        setTurbineCursor(null);
        return;
      }
      const requestId = ++detailRequest.current;
      append ? setTurbinesMoreLoading(true) : setTurbinesLoading(true);
      setTurbinesError('');
      try {
        if (!online || !authenticated) {
          const park = cachedParks().find((item) => item.id === parkId) ?? null;
          const cached = cachedTurbines(parkId).filter((item) =>
            item.code.includes(search.trim().toUpperCase()),
          );
          setSelectedPark(park);
          setTurbines(cached);
          setTurbineCursor(null);
          if (!park) setTurbinesError('Detalhe do parque não está disponível no cache local.');
          return;
        }
        const [park, page] = await Promise.all([
          getPark(workspaceId, parkId),
          getParkTurbines(workspaceId, parkId, {
            limit: 25,
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(cursor ? { cursor } : {}),
          }),
        ]);
        if (requestId !== detailRequest.current) return;
        setSelectedPark(park);
        setTurbines((previous) => (append ? [...previous, ...page.items] : page.items));
        setTurbineCursor(page.nextCursor);
      } catch (error) {
        if (requestId !== detailRequest.current) return;
        const park = cachedParks().find((item) => item.id === parkId) ?? null;
        const cached = cachedTurbines(parkId);
        if (park) {
          setSelectedPark(park);
          setTurbines(cached);
          setTurbineCursor(null);
          setTurbinesError('Servidor indisponível; exibindo o detalhe salvo neste aparelho.');
        } else setTurbinesError(getApiErrorMessage(error, 'carregar as turbinas'));
        if (error instanceof ApiRequestError && [401, 403].includes(error.status)) await refresh();
      } finally {
        if (requestId === detailRequest.current) {
          setTurbinesLoading(false);
          setTurbinesMoreLoading(false);
        }
      }
    },
    [authenticated, cachedParks, cachedTurbines, online, refresh, workspaceId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadParks(parksSearch), 250);
    return () => window.clearTimeout(timer);
  }, [loadParks, parksSearch]);

  useEffect(() => {
    if (!selectedParkId) {
      setSelectedPark(null);
      setTurbines([]);
      setTurbinesError('');
      setTurbinesLoading(false);
      return;
    }
    setSelectedPark(null);
    setTurbines([]);
    setTurbinesError('');
    setTurbinesLoading(true);
  }, [selectedParkId]);

  useEffect(() => {
    if (!selectedParkId) return;
    const timer = window.setTimeout(() => void loadParkDetail(selectedParkId, turbinesSearch), 180);
    return () => window.clearTimeout(timer);
  }, [loadParkDetail, selectedParkId, turbinesSearch]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: changing parks intentionally clears the previous turbine search.
  useEffect(() => {
    setTurbinesSearch('');
  }, [selectedParkId]);

  return {
    parks,
    parkCursor,
    parksSearch,
    setParksSearch,
    parksLoading,
    parksMoreLoading,
    parksError,
    selectedParkId,
    setSelectedParkId,
    selectedPark,
    turbines,
    turbineCursor,
    turbinesSearch,
    setTurbinesSearch,
    turbinesLoading,
    turbinesMoreLoading,
    turbinesError,
    loadParks,
    loadParkDetail,
  };
}
