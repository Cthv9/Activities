# TODO — Equilibrio

Backlog di miglioramenti per versioni future.

## Privacy / sicurezza

- [ ] **Cifratura end-to-end dei nomi attività (per la distribuzione pubblica).**
      Oggi nome famiglia, nomi/unità delle attività e i log sono in chiaro nel
      database: protetti dalla RLS verso gli altri utenti e verso internet, ma
      leggibili da chi ha accesso admin al progetto (service_role / dashboard).
      Finché l'app è a uso personale non è un problema; se la si distribuisce a
      più famiglie diventa opportuno cifrare lato client (E2E) i campi
      sensibili — almeno `activities.name` e `activities.unit` — con una chiave
      che resta sui dispositivi dell'utente.
      Fattibile senza rompere il radar: il calcolo dell'equilibrio conta solo il
      *numero* di occorrenze per attività, non il loro contenuto, quindi il
      nome può essere cifrato mantenendo intatto `get_family_balance`.
      Nota: il PIN (hash bcrypt) e le chiavi VAPID (Vault) sono già protetti.
