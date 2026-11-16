VEXLYSHOP — WERSJA 2.1 (BEZ DODATKOWYCH PACZEK)
================================================

Ta wersja nie wymaga npm install, Express, SQLite, Visual Studio ani kompilatora C++.
Korzysta wyłącznie z wbudowanych modułów Node.js. Zamówienia zapisuje do pliku data/orders.json.

URUCHOMIENIE NA WINDOWS
1. Rozpakuj ZIP do wybranego folderu.
2. Skopiuj plik .env.example i nazwij kopię .env.
3. Otwórz .env w Notatniku i ustaw własne ADMIN_PASSWORD (minimum 16 znaków).
4. Sprawdź LTC_WALLET_ADDRESS.
5. W pasku adresu folderu wpisz cmd i naciśnij Enter.
6. Wpisz: npm start
7. Otwórz: http://localhost:3000

Nie wpisuj npm install — ta wersja go nie potrzebuje.

DANE I PANEL ADMINA
- Zamówienia są zapisywane w data/orders.json.
- Panel administratora jest na dole strony; hasło pochodzi z .env.
- Potwierdzaj wpłatę dopiero po samodzielnym sprawdzeniu TXID, kwoty i potwierdzeń w sieci Litecoin.
- Jedno stałe konto LTC nie umożliwia automatycznego przypisania wpłat do zamówień. Klient podaje TXID, a obsługa sprawdza go ręcznie.

WAŻNE
- Kurs LTC/PLN jest pobierany z CoinGecko podczas tworzenia zamówienia, więc internet jest potrzebny do płatności LTC.
- Strona pod http://localhost:3000 działa tylko na tym komputerze. Aby była publiczna, trzeba wdrożyć ją na hostingu Node.js z trwałym miejscem na plik data/orders.json.
- Przed uruchomieniem publicznym skonfiguruj HTTPS, kopie zapasowe, regulamin i politykę prywatności.
- Nie udostępniaj nikomu hasła administratora, frazy odzyskiwania ani klucza prywatnego portfela.
