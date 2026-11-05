import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNotify, useRefresh } from 'react-admin';
import { listJobs, advanceJobs } from '../../api/jobsApi.js';

const JobsContext = createContext(null);

const FAST_MS = 2500; // while something runs: poll + advance the queue
const SLOW_MS = 30000; // idle: just notice jobs started elsewhere

const DONE_MESSAGES = {
  TERMINE: (j) => ({ type: 'success', text: `Tâche terminée : ${j.libelle}` }),
  TERMINE_AVEC_ERREURS: (j) => ({ type: 'warning', text: `Tâche terminée avec ${j.nbEchecs} échec(s) : ${j.libelle}` }),
  ECHEC: (j) => ({ type: 'error', text: `Tâche échouée : ${j.libelle}${j.erreur ? ` (${j.erreur})` : ''}` }),
};

/**
 * Background jobs of the selected organisateur, polled for the "Tâches"
 * panel. While a job runs, each poll also advances the queue (needed on
 * serverless hosting); a toast appears when a job finishes.
 */
export function JobsProvider({ children }) {
  const notify = useNotify();
  const refreshRef = useRef(null);
  refreshRef.current = useRefresh(); // via a ref: must not restart the polling loop
  const [jobs, setJobs] = useState([]);
  const [open, setOpen] = useState(false);
  const previous = useRef(new Map());
  const timer = useRef(null);

  const running = jobs.filter((j) => !j.termine);

  const poll = useCallback(async () => {
    clearTimeout(timer.current);
    let items = null;
    try {
      const anyRunning = [...previous.current.values()].some((s) => !['TERMINE', 'TERMINE_AVEC_ERREURS', 'ECHEC', 'ANNULE'].includes(s));
      items = anyRunning ? await advanceJobs() : await listJobs();
    } catch {
      // logged out or network down: try again later
    }
    if (items) {
      let finished = false;
      items.forEach((j) => {
        const before = previous.current.get(j.id);
        if (before && before !== j.statut && DONE_MESSAGES[j.statut]) {
          const { type, text } = DONE_MESSAGES[j.statut](j);
          notify(text, { type, autoHideDuration: 8000 });
          finished = true;
        }
      });
      // Lists on screen show the new statuses / categories without a reload.
      if (finished) refreshRef.current();
      previous.current = new Map(items.map((j) => [j.id, j.statut]));
      setJobs(items);
    }
    const stillRunning = items?.some((j) => !j.termine);
    timer.current = setTimeout(poll, stillRunning ? FAST_MS : SLOW_MS);
  }, [notify]);

  useEffect(() => {
    poll();
    return () => clearTimeout(timer.current);
  }, [poll]);

  /** Call after starting a job: shows it at once, opens the panel, then polls. */
  const track = useCallback(
    (jobId, { openPanel = true } = {}) => {
      if (jobId) previous.current.set(jobId, 'EN_ATTENTE');
      if (openPanel) setOpen(true);
      // A plain list first: advancing (serverless) can take a few seconds.
      listJobs()
        .then((items) => setJobs(items))
        .catch(() => {});
      poll();
    },
    [poll],
  );

  return <JobsContext.Provider value={{ jobs, running, open, setOpen, refresh: poll, track }}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  return useContext(JobsContext) || { jobs: [], running: [], open: false, setOpen: () => {}, refresh: () => {}, track: () => {} };
}
