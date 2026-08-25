# System zarządzania pracą agentów ubezpieczeniowych

Projekt licencjacki: aplikacja webowa do obsługi pracy agentów ubezpieczeniowych.

## Technologie

- Frontend: Angular
- Backend: Node.js, Express.js
- Baza danych: SQLite
- Role użytkowników: `ADMIN`, `AGENT`

## Główne funkcje

- logowanie użytkowników i token sesji,
- role administratora i agenta,
- wymuszona zmiana hasła przy pierwszym logowaniu,
- walidacja silnego hasła,
- zarządzanie agentami i statusem `Aktywny` / `Nieaktywny`,
- zarządzanie spotkaniami i przypisywanie ich do agentów,
- dodawanie własnych spotkań przez agenta,
- blokada nakładania się spotkań dla tego samego agenta,
- propozycja najbliższego wolnego terminu,
- statusy spotkań,
- notatki i załączniki do spotkań,
- dokumentacja spotkań agenta,
- ewidencja czasu pracy,
- audyt zmian,
- raport nadzoru administratora,
- wyszukiwarki i scrollowane tabele w głównych modułach.

## Uruchomienie

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Backend działa domyślnie pod adresem:

```text
http://localhost:4000
```

Przy pierwszym uruchomieniu backend automatycznie tworzy lokalną bazę SQLite w `backend/data/app.sqlite` oraz dodaje dane demonstracyjne. Plik bazy jest ignorowany przez Git i nie powinien być commitowany.

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend działa domyślnie pod adresem:

```text
http://localhost:4200
```

## Konfiguracja backendu

Przykładowe zmienne znajdują się w pliku `backend/.env.example`.

```env
PORT=4000
AUTH_SECRET=change-this-secret-before-running-outside-demo
DATABASE_PATH=./data/app.sqlite
DISABLE_DEMO_DATA=false
```

## Konta demonstracyjne

Administrator:

```text
E-mail: admin@firma.pl
Hasło: admin123
```

Przykładowy agent:

```text
E-mail: anna.nowak@firma.pl
Hasło: Agent@123
```

Konta agentów demonstracyjnych mają domyślnie wymuszoną zmianę hasła przy pierwszym logowaniu.

## Role w systemie

Administrator może:

- zarządzać agentami,
- tworzyć, edytować i usuwać spotkania,
- przypisywać spotkania agentom,
- przeglądać raporty i audyt zmian,
- zarządzać ewidencją czasu pracy agentów.

Agent może:

- przeglądać swoje spotkania,
- dodawać własne spotkania,
- zmieniać status swoich spotkań,
- dodawać notatki i załączniki,
- prowadzić własną ewidencję czasu pracy,
- edytować dane swojego konta.

## Scenariusz prezentacyjny

1. Zaloguj się jako administrator.
2. Dodaj lub edytuj agenta.
3. Dodaj spotkanie dla agenta.
4. Spróbuj dodać drugie spotkanie w tym samym terminie i użyj proponowanego wolnego terminu.
5. Zaloguj się jako agent.
6. Dodaj własne spotkanie.
7. Dodaj notatkę i załącznik do spotkania.
8. Uzupełnij ewidencję czasu pracy.
9. Wróć jako administrator i sprawdź raport oraz audyt zmian.
