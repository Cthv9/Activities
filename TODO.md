# TODO — Equilibrio

Backlog di miglioramenti, raggruppati per tema e priorità.

## 🔴 Sicurezza (fare per primo)

- [ ] **RLS: escalation di privilegi su `family_members` UPDATE** (0001_init.sql:98).
      Manca `WITH CHECK`: un membro può auto-promuoversi `owner` o spostarsi in
      un'altra famiglia. Aggiungere `WITH CHECK` che consenta ai non-owner solo
      la modifica del proprio `display_name`.
- [ ] **`WITH CHECK` mancante anche su `activities` / `activity_logs` UPDATE**
      (righe 137, 171). Rischio minore, uniformare.
- [ ] **Brute-force PIN**: rate limit solo per (famiglia, IP). Valutare PIN
      minimo 6 cifre, lockout/backoff per famiglia, link di accesso con scadenza.
- [ ] **Abuso anonymous sign-in**: captcha (Turnstile) + pulizia utenti anonimi
      e righe membro orfane.

## 🟡 Correttezza / robustezza

- [ ] **Crash multi-famiglia** (AuthContext): `maybeSingle()` esplode se l'utente
      appartiene a più contenitori. Va risolto insieme al multi-contenitore.
- [ ] **Accumulo membri "PIN"**: ogni accesso PIN dopo storage svuotato crea un
      nuovo utente anonimo + riga membro. Dedup / device key stabile.
- [ ] **Error boundary React**: chunk lazy non caricato → schermata bianca.
      Aggiungere boundary con "riprova".
- [ ] **Idempotenza coda offline**: evitare doppio invio log in retry.

## 🟢 UX pratica (segnalazioni d'uso)

- [ ] **Logout poco visibile**: esiste in Impostazioni ("Esci") ma va reso più
      raggiungibile (es. anche dall'header).
- [ ] **Annulla registrazione**: poter annullare un log appena fatto (toast
      "registrato — Annulla") e cancellare un incremento sbagliato.
- [ ] **Correggere/eliminare attività inserite per errore**, in modo più diretto.
- [ ] **Selezione testo in PWA**: il long-press seleziona/copia il testo e rende
      l'app poco "nativa". `user-select: none` sulla UI (mantenendolo su input e
      contenuti dell'utente).
- [ ] **Focus-trap nel modale** "Nuova attività" + ripristino focus (a11y).

## 🔵 Prodotto — modello a contenitori

- [ ] **Da "famiglia" a "contenitore/spazio"**: un utente ha più dashboard
      (Casa, Lavoro, Palestra…), ognuna con le sue attività, e uno switcher per
      cambiare contesto. Lo schema già supporta un utente in più "famiglie":
      serve rinominare il concetto, aggiungere lo switcher e sistemare il carico
      della membership (vedi crash multi-famiglia).
- [ ] **Modalità privacy per contenitore**: un contenitore può essere nascosto /
      protetto (es. conteggi personali). Si lega alla cifratura E2E qui sotto e a
      un lock (PIN/biometria) per aprirlo.
- [ ] **Cifratura end-to-end dei nomi attività (per distribuzione pubblica).**
      Oggi nomi famiglia/attività/unità e log sono in chiaro nel DB: protetti
      dalla RLS verso altri utenti e verso internet, ma leggibili da chi ha
      accesso admin (service_role / dashboard). Per un uso multi-famiglia
      distribuito, cifrare lato client `activities.name` e `activities.unit` con
      chiave sui dispositivi. Fattibile senza rompere il radar (che conta solo il
      numero di occorrenze). PIN (hash bcrypt) e VAPID (Vault) già protetti.

## 🎨 Redesign visivo

- [ ] **Restyle "liquid glass" chiaro**: tema più moderno, luminoso, con
      superfici translucide. Da fare DOPO il modello a contenitori (per non
      ridisegnare la navigazione due volte). Attenzione a contrasto/accessibilità
      del glass e ai colori del radar su fondo chiaro (vanno ritarati).
      Valutare tema chiaro di default + dark opzionale (theme-aware).
