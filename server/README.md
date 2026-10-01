# Leaderboard server – Žižkov Night Run

Malý server v Node.js s databází SQLite. Nemá žádné závislosti, stačí Node 22.13 nebo novější (doporučuju 24).

- **Hráči** zadají přezdívku a e-mail a potvrdí souhlas. Hra pak každou jízdu nahlásí serveru a ten ukládá nejlepší skóre.
- **Veřejně** (API pro hru) jsou vidět jen přezdívky a skóre. E-maily se dají vytáhnout jedině přímo na serveru přes `admin.js`.
- **Proti podvádění:** server si sám měří, jak dlouho jízda trvala, a odmítne skóre, které za tu dobu nejde ujet (auto jede max. 136 m/s).

## Kapacita

Zátěžový test (10 000 hráčů, 300 najednou, každý se zaregistruje, odjede jízdu a načte žebříček):
40 000 požadavků za 9,4 s, tj. asi 4 250 požadavků/s. 99 % odpovědí do 0,2 s, žádná chyba, server zabral 91 MB paměti.
Samotný žebříček (je na 2 s v paměti) zvládne asi 8 000 požadavků/s.

Pro představu: kdyby 10 000 lidí hrálo **naráz** a každý dokončil jízdu jednou za minutu, je to asi 700 požadavků/s.
To má velkou rezervu. Doporučená velikost: **2 vCPU, 2 GB RAM, SSD**. Víc není potřeba.

## Co budeš potřebovat

1. **VPS s Linuxem.** Nejlíp Ubuntu 24.04 se 2 vCPU a 2 GB RAM (Hetzner, Wedos, Forpsi, DigitalOcean…).
2. **Doménu nebo subdoménu**, třeba `api.tvoje-domena.cz`, se záznamem **A** na IP adresu serveru.
   Hra běží na HTTPS (GitHub Pages), takže i server musí mít HTTPS. Certifikát zařídí Caddy sám.
   *Bez vlastní domény:* jde použít `IP-ADRESA.sslip.io`, například `203-0-113-7.sslip.io`.

## Instalace (jednou)

Na serveru přes SSH:

```bash
# Node 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy (HTTPS + přeposílání na Node)
sudo apt install -y caddy

# uživatel a složka pro server
sudo useradd --system --home /opt/znr --shell /usr/sbin/nologin znr
sudo mkdir -p /opt/znr && sudo chown znr:znr /opt/znr
```

Ze svého počítače nahraj soubory ze složky `server/` (bez `.db` souborů):

```bash
scp server.js db.js admin.js package.json uzivatel@IP-SERVERU:/tmp/
# na serveru:
sudo mv /tmp/server.js /tmp/db.js /tmp/admin.js /tmp/package.json /opt/znr/ && sudo chown znr:znr /opt/znr/*
```

### Aby server běžel pořád (i po restartu)

Vytvoř `/etc/systemd/system/znr.service`:

```ini
[Unit]
Description=Zizkov Night Run leaderboard
After=network.target

[Service]
User=znr
WorkingDirectory=/opt/znr
Environment=PORT=3000
Environment=TRUST_PROXY=1
Environment=ALLOWED_ORIGINS=https://ondrejhladik-ctrl.github.io
ExecStart=/usr/bin/node /opt/znr/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now znr
curl http://localhost:3000/api/health      # → {"ok":true}
```

### HTTPS přes Caddy

Obsah `/etc/caddy/Caddyfile` nahraď tímhle (s tvou doménou):

```
api.tvoje-domena.cz {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
curl https://api.tvoje-domena.cz/api/health   # → {"ok":true}
```

Firewall: otevřené musí být porty 80 a 443 (Caddy). Port 3000 ven otevírat nemusíš.

## Zapnutí ve hře

V `js/config.js` nastav adresu serveru:

```js
leaderboard: { api: 'https://api.tvoje-domena.cz', top: 5 },
```

Pak nahraj hru na GitHub. Od té chvíle se hráči po loading screenu registrují a na konci jízdy uvidí žebříček.
Když `api` necháš prázdné, hra funguje jako dřív, bez registrace.

## Správa (na serveru)

```bash
cd /opt/znr
sudo -u znr node admin.js top 10             # vítězové i s e-maily (CSV)
sudo -u znr node admin.js top 10 > vitezove.csv
sudo -u znr node admin.js count              # počet hráčů
sudo -u znr node admin.js flagged            # odmítnuté (podezřelé) jízdy
sudo -u znr node admin.js delete email@x.cz  # smazání hráče na jeho žádost (GDPR)
sudo -u znr node admin.js backup /opt/znr/zaloha-$(date +%F).db   # záloha, i za běhu
```

Databáze je v `/opt/znr/leaderboard.db`. **Nikdy ji nedávej na GitHub**, jsou v ní e-maily (`.gitignore` ji vynechává).
Zálohu si pravidelně stahuj k sobě (`scp`).

## Jak to funguje

| Požadavek | Co dělá |
|---|---|
| `POST /api/register` `{nickname, email, consent}` | nový hráč, nebo znovupřihlášení (stejný e-mail + stejná přezdívka) → tajný token |
| `POST /api/runs` | začátek jízdy, server si zapíše čas |
| `POST /api/runs/:id/finish` `{score}` | konec jízdy; skóre se uloží, jen když je za ten čas možné |
| `GET /api/leaderboard?limit=5` | TOP hráči (přezdívka + skóre); s tokenem i tvoje pořadí |

- **Přezdívka:** 2–16 znaků (písmena včetně diakritiky, čísla, mezera, `. _ -`). Přezdívky i e-maily jsou unikátní a nerozlišují velká a malá písmena.
- **Token:** v databázi je uložený jen jeho otisk (SHA-256).
- **Limity:** 200 registrací za 10 min a 3000 požadavků za minutu z jedné IP. Jsou schválně štědré, protože mobilní operátoři schovávají tisíce lidí za jednu IP adresu. Na hráče pak platí 20 jízd za minutu. Limity změníš proměnnými `LIMIT_REGISTER` a `LIMIT_REQUESTS` v souboru služby.
- **Omezení:** e-mail se neověřuje. Kdo zadá cizí e-mail, zaregistruje se pod ním, ale výhru pošleš na adresu, kterou si vybereš ty. Kontrola času zastaví hrubé podvody, ne každý.
