const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function addColumnIfNotExists(db, tableName, columnName, columnDefinition) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  const columnExists = columns.some((column) => column.name === columnName);

  if (!columnExists) {
    await db.exec(`
      ALTER TABLE ${tableName}
      ADD COLUMN ${columnName} ${columnDefinition}
    `);
  }
}

async function createDefaultAdmin(db) {
  const adminEmail = 'admin@firma.pl';

  const existingAdmin = await db.get(
    `
    SELECT id
    FROM agents
    WHERE email = ?
    `,
    [adminEmail]
  );

  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await db.run(
    `
    INSERT INTO agents (
      first_name,
      last_name,
      email,
      phone,
      status,
      password,
      role,
      must_change_password
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      'Administrator',
      'Systemu',
      adminEmail,
      '000000000',
      'Aktywny',
      hashedPassword,
      'ADMIN',
      0
    ]
  );

  console.log('Utworzono domyślne konto administratora: admin@firma.pl / admin123');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateTime(date, hours, minutes = 0) {
  return `${formatDate(date)}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date;
}

async function getAgentByEmail(db, email) {
  return db.get(
    `
    SELECT id
    FROM agents
    WHERE email = ?
    `,
    [email]
  );
}

async function createDemoAgent(db, data, hashedPassword) {
  const existingAgent = await getAgentByEmail(db, data.email);

  if (existingAgent) {
    return existingAgent.id;
  }

  const result = await db.run(
    `
    INSERT INTO agents (
      first_name,
      last_name,
      email,
      phone,
      status,
      password,
      role,
      must_change_password
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phone,
      data.status,
      hashedPassword,
      'AGENT',
      1
    ]
  );

  return result.lastID;
}

async function createDemoMeeting(db, data) {
  const existingMeeting = await db.get(
    `
    SELECT id
    FROM meetings
    WHERE title = ?
    `,
    [data.title]
  );

  if (existingMeeting) {
    return existingMeeting.id;
  }

  const result = await db.run(
    `
    INSERT INTO meetings (
      title,
      description,
      meeting_type,
      start_date,
      end_date,
      status,
      agent_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.title,
      data.description,
      data.meetingType,
      data.startDate,
      data.endDate,
      data.status,
      data.agentId
    ]
  );

  return result.lastID;
}

async function createDemoWorkTimeEntry(db, data) {
  const existingEntry = await db.get(
    `
    SELECT id
    FROM work_time_entries
    WHERE agent_id = ?
      AND work_date = ?
      AND start_time = ?
    `,
    [
      data.agentId,
      data.workDate,
      data.startTime
    ]
  );

  if (existingEntry) {
    return;
  }

  await db.run(
    `
    INSERT INTO work_time_entries (
      agent_id,
      work_date,
      start_time,
      end_time,
      description
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      data.agentId,
      data.workDate,
      data.startTime,
      data.endTime,
      data.description
    ]
  );
}

async function createDemoMeetingNote(db, meetingId, content) {
  const existingNote = await db.get(
    `
    SELECT id
    FROM meeting_notes
    WHERE meeting_id = ?
      AND content = ?
    `,
    [meetingId, content]
  );

  if (existingNote) {
    return;
  }

  await db.run(
    `
    INSERT INTO meeting_notes (
      meeting_id,
      content
    )
    VALUES (?, ?)
    `,
    [meetingId, content]
  );
}

async function createDemoAttachment(db, meetingId) {
  const fileName = 'demo-polisa-notatka.txt';
  const uploadDirectory = path.join(__dirname, '../../uploads');
  const filePath = path.join(uploadDirectory, fileName);

  const existingAttachment = await db.get(
    `
    SELECT id
    FROM meeting_attachments
    WHERE meeting_id = ?
      AND file_name = ?
    `,
    [meetingId, fileName]
  );

  if (existingAttachment) {
    return;
  }

  fs.mkdirSync(uploadDirectory, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      'Przykładowy załącznik demonstracyjny do spotkania z klientem.\n',
      'utf8'
    );
  }

  await db.run(
    `
    INSERT INTO meeting_attachments (
      meeting_id,
      original_name,
      file_name,
      file_path,
      mime_type
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      meetingId,
      'notatka-do-polisy.txt',
      fileName,
      filePath,
      'text/plain'
    ]
  );
}

async function createDemoAuditLogs(db, adminId) {
  const existingLog = await db.get(
    `
    SELECT id
    FROM audit_logs
    WHERE action = 'DEMO_DATA_SEED'
    `
  );

  if (existingLog) {
    return;
  }

  const logs = [
    [
      adminId,
      'ADMIN',
      'DEMO_DATA_SEED',
      'SYSTEM',
      'Dodano przykładowe dane demonstracyjne do prezentacji systemu.'
    ],
    [
      adminId,
      'ADMIN',
      'CREATE_AGENT',
      'AGENT',
      'Dodano przykładowych agentów: Annę Nowak, Piotra Zielińskiego i Marię Wiśniewską.'
    ],
    [
      adminId,
      'ADMIN',
      'CREATE_MEETING',
      'MEETING',
      'Dodano przykładowe spotkania w różnych statusach.'
    ],
    [
      adminId,
      'ADMIN',
      'CREATE_WORK_TIME',
      'WORK_TIME_ENTRY',
      'Dodano przykładowe wpisy czasu pracy agentów.'
    ]
  ];

  for (const log of logs) {
    await db.run(
      `
      INSERT INTO audit_logs (
        user_id,
        user_role,
        action,
        entity_type,
        description
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      log
    );
  }
}

async function createDemoData(db) {
  if (process.env.DISABLE_DEMO_DATA === 'true') {
    return;
  }

  const admin = await getAgentByEmail(db, 'admin@firma.pl');
  const hashedPassword = await bcrypt.hash('Agent@123', 10);

  const annaId = await createDemoAgent(db, {
    firstName: 'Anna',
    lastName: 'Nowak',
    email: 'anna.nowak@firma.pl',
    phone: '501222333',
    status: 'Aktywny'
  }, hashedPassword);

  const piotrId = await createDemoAgent(db, {
    firstName: 'Piotr',
    lastName: 'Zieliński',
    email: 'piotr.zielinski@firma.pl',
    phone: '502333444',
    status: 'Aktywny'
  }, hashedPassword);

  const mariaId = await createDemoAgent(db, {
    firstName: 'Maria',
    lastName: 'Wiśniewska',
    email: 'maria.wisniewska@firma.pl',
    phone: '503444555',
    status: 'Nieaktywny'
  }, hashedPassword);

  const tomaszId = await createDemoAgent(db, {
    firstName: 'Tomasz',
    lastName: 'Kaczmarek',
    email: 'tomasz.kaczmarek@firma.pl',
    phone: '504555666',
    status: 'Aktywny'
  }, hashedPassword);

  const katarzynaId = await createDemoAgent(db, {
    firstName: 'Katarzyna',
    lastName: 'Lewandowska',
    email: 'katarzyna.lewandowska@firma.pl',
    phone: '505666777',
    status: 'Aktywny'
  }, hashedPassword);

  const pawelId = await createDemoAgent(db, {
    firstName: 'Paweł',
    lastName: 'Wójcik',
    email: 'pawel.wojcik@firma.pl',
    phone: '506777888',
    status: 'Aktywny'
  }, hashedPassword);

  const ewaId = await createDemoAgent(db, {
    firstName: 'Ewa',
    lastName: 'Kamińska',
    email: 'ewa.kaminska@firma.pl',
    phone: '507888999',
    status: 'Nieaktywny'
  }, hashedPassword);

  const completedMeetingId = await createDemoMeeting(db, {
    title: 'Omówienie polisy komunikacyjnej',
    description: 'Spotkanie z klientem dotyczące odnowienia polisy OC/AC.',
    meetingType: 'Spotkanie z klientem',
    startDate: formatDateTime(addDays(-4), 10, 0),
    endDate: formatDateTime(addDays(-4), 11, 0),
    status: 'Zakończone',
    agentId: annaId
  });

  const plannedMeetingId = await createDemoMeeting(db, {
    title: 'Prezentacja oferty mieszkaniowej',
    description: 'Przygotowanie oferty ubezpieczenia mieszkania dla nowego klienta.',
    meetingType: 'Spotkanie z klientem',
    startDate: formatDateTime(addDays(1), 9, 30),
    endDate: formatDateTime(addDays(1), 10, 30),
    status: 'Zaplanowane',
    agentId: annaId
  });

  const damageMeetingId = await createDemoMeeting(db, {
    title: 'Oględziny szkody po zalaniu',
    description: 'Weryfikacja dokumentacji i zdjęć szkody.',
    meetingType: 'Oględziny szkody',
    startDate: formatDateTime(addDays(2), 12, 0),
    endDate: formatDateTime(addDays(2), 13, 30),
    status: 'Zaplanowane',
    agentId: piotrId
  });

  await createDemoMeeting(db, {
    title: 'Status likwidacji szkody',
    description: 'Kontakt z klientem w sprawie brakujących dokumentów.',
    meetingType: 'Inna sprawa',
    startDate: formatDateTime(addDays(0), 14, 0),
    endDate: formatDateTime(addDays(0), 14, 45),
    status: 'W realizacji',
    agentId: piotrId
  });

  await createDemoMeeting(db, {
    title: 'Przełożone spotkanie z przedsiębiorcą',
    description: 'Klient poprosił o zmianę terminu rozmowy o ubezpieczeniu firmowym.',
    meetingType: 'Spotkanie z klientem',
    startDate: formatDateTime(addDays(3), 11, 0),
    endDate: formatDateTime(addDays(3), 12, 0),
    status: 'Przełożone',
    agentId: mariaId
  });

  const tomaszPlannedMeetingId = await createDemoMeeting(db, {
    title: 'Analiza potrzeb klienta firmowego',
    description: 'Rozmowa dotycząca pakietu ubezpieczeń dla małej firmy.',
    meetingType: 'Spotkanie z klientem',
    startDate: formatDateTime(addDays(1), 12, 0),
    endDate: formatDateTime(addDays(1), 13, 0),
    status: 'Zaplanowane',
    agentId: tomaszId
  });

  const tomaszCompletedMeetingId = await createDemoMeeting(db, {
    title: 'Przegląd ubezpieczenia firmowego',
    description: 'Omówienie aktualnej polisy i propozycja rozszerzenia zakresu ochrony.',
    meetingType: 'Spotkanie z klientem',
    startDate: formatDateTime(addDays(-2), 9, 0),
    endDate: formatDateTime(addDays(-2), 10, 0),
    status: 'Zakończone',
    agentId: tomaszId
  });

  const tomaszFollowUpMeetingId = await createDemoMeeting(db, {
    title: 'Doprecyzowanie oferty flotowej',
    description: 'Telefoniczne ustalenie liczby pojazdów i wariantu ochrony.',
    meetingType: 'Inna sprawa',
    startDate: formatDateTime(addDays(3), 14, 0),
    endDate: formatDateTime(addDays(3), 14, 30),
    status: 'Zaplanowane',
    agentId: tomaszId
  });

  await createDemoMeeting(db, {
    title: 'Konsultacja ubezpieczenia na życie',
    description: 'Omówienie zakresu ochrony i wariantów składki.',
    meetingType: 'Spotkanie z klientem',
    startDate: formatDateTime(addDays(-1), 11, 0),
    endDate: formatDateTime(addDays(-1), 12, 0),
    status: 'Zakończone',
    agentId: katarzynaId
  });

  await createDemoMeeting(db, {
    title: 'Aktualizacja dokumentów klienta',
    description: 'Uzupełnienie brakujących danych do dokumentacji polisy.',
    meetingType: 'Inna sprawa',
    startDate: formatDateTime(addDays(4), 10, 0),
    endDate: formatDateTime(addDays(4), 10, 45),
    status: 'Zaplanowane',
    agentId: pawelId
  });

  await createDemoMeeting(db, {
    title: 'Anulowana konsultacja majątkowa',
    description: 'Klient odwołał spotkanie z powodu zmiany terminu wyjazdu.',
    meetingType: 'Spotkanie z klientem',
    startDate: formatDateTime(addDays(2), 15, 0),
    endDate: formatDateTime(addDays(2), 16, 0),
    status: 'Anulowane',
    agentId: ewaId
  });

  await createDemoMeetingNote(
    db,
    completedMeetingId,
    'Klient zaakceptował zakres polisy i poprosił o przesłanie podsumowania na e-mail.'
  );

  await createDemoMeetingNote(
    db,
    plannedMeetingId,
    'Przed spotkaniem przygotować wariant podstawowy i rozszerzony ubezpieczenia.'
  );

  await createDemoMeetingNote(
    db,
    damageMeetingId,
    'Do sprawdzenia: zdjęcia szkody, numer polisy oraz data zgłoszenia.'
  );

  await createDemoMeetingNote(
    db,
    tomaszPlannedMeetingId,
    'Przygotować wariant podstawowy, rozszerzony oraz kalkulację dla pakietu firmowego.'
  );

  await createDemoMeetingNote(
    db,
    tomaszCompletedMeetingId,
    'Klient jest zainteresowany rozszerzeniem ochrony o odpowiedzialność cywilną działalności.'
  );

  await createDemoMeetingNote(
    db,
    tomaszFollowUpMeetingId,
    'Do rozmowy przygotować pytania o liczbę pojazdów i historię szkód.'
  );

  await createDemoAttachment(db, completedMeetingId);
  await createDemoAttachment(db, tomaszCompletedMeetingId);

  await createDemoWorkTimeEntry(db, {
    agentId: annaId,
    workDate: formatDate(addDays(-4)),
    startTime: '08:00',
    endTime: '16:00',
    description: 'Obsługa klientów, spotkanie polisowe i uzupełnienie dokumentacji.'
  });

  await createDemoWorkTimeEntry(db, {
    agentId: annaId,
    workDate: formatDate(addDays(-3)),
    startTime: '09:00',
    endTime: '15:00',
    description: 'Przygotowanie ofert i kontakt telefoniczny z klientami.'
  });

  await createDemoWorkTimeEntry(db, {
    agentId: piotrId,
    workDate: formatDate(addDays(-2)),
    startTime: '08:30',
    endTime: '14:30',
    description: 'Oględziny szkody, dokumentacja i aktualizacja statusów spotkań.'
  });

  await createDemoWorkTimeEntry(db, {
    agentId: tomaszId,
    workDate: formatDate(addDays(-1)),
    startTime: '08:00',
    endTime: '15:30',
    description: 'Spotkania z klientami firmowymi i przygotowanie ofert.'
  });

  await createDemoWorkTimeEntry(db, {
    agentId: tomaszId,
    workDate: formatDate(addDays(-2)),
    startTime: '09:00',
    endTime: '16:00',
    description: 'Przegląd polis firmowych, notatki po spotkaniach i uzupełnienie dokumentacji.'
  });

  await createDemoWorkTimeEntry(db, {
    agentId: katarzynaId,
    workDate: formatDate(addDays(-1)),
    startTime: '10:00',
    endTime: '17:00',
    description: 'Konsultacje ubezpieczeń życiowych i aktualizacja notatek.'
  });

  await createDemoWorkTimeEntry(db, {
    agentId: pawelId,
    workDate: formatDate(addDays(-2)),
    startTime: '09:00',
    endTime: '13:30',
    description: 'Porządkowanie dokumentacji i kontakt z klientami.'
  });

  await createDemoAuditLogs(db, admin?.id || null);
}

async function openDatabase() {
  fs.mkdirSync(path.join(__dirname, '../../data'), { recursive: true });

  const db = await open({
    filename: './data/app.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktywny'
    );
  `);

  await addColumnIfNotExists(db, 'agents', 'password', 'TEXT');
  await addColumnIfNotExists(db, 'agents', 'role', "TEXT NOT NULL DEFAULT 'AGENT'");
  await addColumnIfNotExists(db, 'agents', 'must_change_password', 'INTEGER NOT NULL DEFAULT 1');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      meeting_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Zaplanowane',
      agent_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS work_time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      work_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES agents(id)
    )
  `);

  await createDefaultAdmin(db);
  await createDemoData(db);

  return db;
}

module.exports = {
  openDatabase
};
