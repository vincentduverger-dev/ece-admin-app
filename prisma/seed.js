require("dotenv/config");

const { randomBytes, scryptSync } = require("node:crypto");
const { PrismaPg } = require("@prisma/adapter-pg");
const {
  ApplicationStatus,
  EmailSendStatus,
  EmailType,
  PrismaClient,
  StudentGender
} = require("@prisma/client");

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run Prisma seed.");
  }

  return databaseUrl;
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: getDatabaseUrl()
  })
});

const createUtcDate = (year, month, day, hour = 9, minute = 0) =>
  new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

const normalizeAdminEmail = (email) => email.trim().toLowerCase();

const isEnvTrue = (value) => ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = scryptSync(password, salt, 64);

  return `scrypt:${salt}:${derivedKey.toString("base64url")}`;
};

const LEVELS = [
  { code: "TPS", label: "Toute Petite Section", sortOrder: 0, availablePlaces: 0 },
  { code: "PS", label: "Petite Section", sortOrder: 1, availablePlaces: 18 },
  { code: "MS", label: "Moyenne Section", sortOrder: 2, availablePlaces: 18 },
  { code: "GS", label: "Grande Section", sortOrder: 3, availablePlaces: 18 },
  { code: "CP", label: "CP", sortOrder: 4, availablePlaces: 22 },
  { code: "CE1", label: "CE1", sortOrder: 5, availablePlaces: 22 },
  { code: "CE2", label: "CE2", sortOrder: 6, availablePlaces: 22 },
  { code: "CM1", label: "CM1", sortOrder: 7, availablePlaces: 24 },
  { code: "CM2", label: "CM2", sortOrder: 8, availablePlaces: 24 },
  { code: "6E", label: "6e", sortOrder: 9, availablePlaces: 0 },
  { code: "5E", label: "5e", sortOrder: 10, availablePlaces: 0 },
  { code: "4E", label: "4e", sortOrder: 11, availablePlaces: 0 },
  { code: "3E", label: "3e", sortOrder: 12, availablePlaces: 0 },
  { code: "SECONDE", label: "Seconde", sortOrder: 13, availablePlaces: 0 },
  { code: "PREMIERE", label: "Première", sortOrder: 14, availablePlaces: 0 },
  { code: "TERMINALE", label: "Terminale", sortOrder: 15, availablePlaces: 0 }
];

const ACTIVE_SCHOOL_YEAR = {
  label: "2026-2027",
  startYear: 2026,
  endYear: 2027,
  isActive: true
};

const APPLICATION_SEEDS = [
  {
    family: {
      fatherLastName: "Martin",
      fatherFirstName: "Adrien",
      fatherCity: "Paris",
      motherLastName: "Martin",
      motherFirstName: "Camille",
      motherCity: "Paris",
      familyStatus: "Maries",
      contactEmail: "camille.martin.seed@academie-horizon.test",
      contactPhone: "0600000001",
      postalAddress: "12 rue des Tilleuls, 75015 Paris",
      googleAccountEmail: null
    },
    application: {
      rawCsvRowHash: "seed-application-martin-2026-01",
      submittedAt: createUtcDate(2026, 1, 9, 8, 45),
      declaredChildrenCount: 1,
      discoverySource: "Google Forms",
      status: ApplicationStatus.IN_REVIEW,
      isPriority: false,
      decisionAt: null,
      decisionNote: null
    },
    students: [
      {
        firstName: "Leo",
        lastName: "Martin",
        gender: StudentGender.BOY,
        birthDate: createUtcDate(2023, 5, 14),
        levelCode: "PS",
        rankInForm: 1
      }
    ],
    emailLogs: []
  },
  {
    family: {
      fatherLastName: "Bernard",
      fatherFirstName: "Julien",
      fatherCity: "Issy-les-Moulineaux",
      motherLastName: "Bernard",
      motherFirstName: "Sophie",
      motherCity: "Issy-les-Moulineaux",
      familyStatus: "Union libre",
      contactEmail: "famille.bernard.seed@academie-horizon.test",
      contactPhone: "0600000002",
      postalAddress: "4 allee des Erables, 92130 Issy-les-Moulineaux",
      googleAccountEmail: null
    },
    application: {
      rawCsvRowHash: "seed-application-bernard-2026-02",
      submittedAt: createUtcDate(2026, 1, 16, 10, 5),
      declaredChildrenCount: 2,
      discoverySource: "Portes ouvertes",
      status: ApplicationStatus.IN_REVIEW,
      isPriority: true,
      decisionAt: null,
      decisionNote: null
    },
    students: [
      {
        firstName: "Emma",
        lastName: "Bernard",
        gender: StudentGender.GIRL,
        birthDate: createUtcDate(2021, 2, 11),
        levelCode: "GS",
        rankInForm: 1
      },
      {
        firstName: "Tom",
        lastName: "Bernard",
        gender: StudentGender.BOY,
        birthDate: createUtcDate(2020, 9, 2),
        levelCode: "CP",
        rankInForm: 2
      }
    ],
    emailLogs: []
  },
  {
    family: {
      fatherLastName: "Petit",
      fatherFirstName: "Nicolas",
      fatherCity: "Boulogne-Billancourt",
      motherLastName: "Petit",
      motherFirstName: "Sarah",
      motherCity: "Boulogne-Billancourt",
      familyStatus: "Maries",
      contactEmail: "famille.petit.seed@academie-horizon.test",
      contactPhone: "0600000003",
      postalAddress: "18 avenue Victor Hugo, 92100 Boulogne-Billancourt",
      googleAccountEmail: null
    },
    application: {
      rawCsvRowHash: "seed-application-petit-2026-03",
      submittedAt: createUtcDate(2026, 1, 25, 14, 20),
      declaredChildrenCount: 1,
      discoverySource: "Site de l'ecole",
      status: ApplicationStatus.ACCEPTED,
      isPriority: false,
      decisionAt: createUtcDate(2026, 2, 20, 16, 30),
      decisionNote: "Admission validee apres entretien."
    },
    students: [
      {
        firstName: "Jules",
        lastName: "Petit",
        gender: StudentGender.BOY,
        birthDate: createUtcDate(2019, 6, 18),
        levelCode: "CE1",
        rankInForm: 1
      }
    ],
    emailLogs: [
      {
        emailType: EmailType.ACCEPTANCE,
        recipientEmail: "famille.petit.seed@academie-horizon.test",
        subject: "Académie Horizon - decision d'admission",
        bodySnapshot: "Votre demande d'inscription a ete acceptee pour l'annee 2026-2027.",
        sentAt: createUtcDate(2026, 2, 21, 9, 10),
        sendStatus: EmailSendStatus.SENT
      }
    ]
  },
  {
    family: {
      fatherLastName: "Laurent",
      fatherFirstName: "Marc",
      fatherCity: "Vanves",
      motherLastName: "Laurent",
      motherFirstName: "Elise",
      motherCity: "Vanves",
      familyStatus: "Separes",
      contactEmail: "famille.laurent.seed@academie-horizon.test",
      contactPhone: "0600000004",
      postalAddress: "7 rue Jean Bleuzen, 92170 Vanves",
      googleAccountEmail: null
    },
    application: {
      rawCsvRowHash: "seed-application-laurent-2026-04",
      submittedAt: createUtcDate(2026, 2, 3, 11, 0),
      declaredChildrenCount: 1,
      discoverySource: "Google Forms",
      status: ApplicationStatus.WAITLISTED,
      isPriority: false,
      decisionAt: createUtcDate(2026, 3, 4, 15, 45),
      decisionNote: "Dossier place en liste d'attente faute de place disponible."
    },
    students: [
      {
        firstName: "Nina",
        lastName: "Laurent",
        gender: StudentGender.GIRL,
        birthDate: createUtcDate(2022, 3, 7),
        levelCode: "MS",
        rankInForm: 1
      }
    ],
    emailLogs: [
      {
        emailType: EmailType.WAITLIST,
        recipientEmail: "famille.laurent.seed@academie-horizon.test",
        subject: "Académie Horizon - decision concernant votre demande d'inscription",
        bodySnapshot:
          "La demande est actuellement placee en liste d'attente, dans l'attente d'une place disponible.",
        sentAt: null,
        sendStatus: EmailSendStatus.FAILED
      }
    ]
  },
  {
    family: {
      fatherLastName: "Dubois",
      fatherFirstName: "Antoine",
      fatherCity: "Meudon",
      motherLastName: "Dubois",
      motherFirstName: "Claire",
      motherCity: "Meudon",
      familyStatus: "Maries",
      contactEmail: "famille.dubois.seed@academie-horizon.test",
      contactPhone: "0600000005",
      postalAddress: "31 rue de la Republique, 92190 Meudon",
      googleAccountEmail: null
    },
    application: {
      rawCsvRowHash: "seed-application-dubois-2026-05",
      submittedAt: createUtcDate(2026, 2, 11, 9, 35),
      declaredChildrenCount: 3,
      discoverySource: "Bouche a oreille",
      status: ApplicationStatus.ACCEPTED,
      isPriority: true,
      decisionAt: createUtcDate(2026, 3, 12, 17, 5),
      decisionNote: "Admission accordee pour la fratrie."
    },
    students: [
      {
        firstName: "Adam",
        lastName: "Dubois",
        gender: StudentGender.BOY,
        birthDate: createUtcDate(2018, 11, 9),
        levelCode: "CE2",
        rankInForm: 1
      },
      {
        firstName: "Sarah",
        lastName: "Dubois",
        gender: StudentGender.GIRL,
        birthDate: createUtcDate(2017, 7, 1),
        levelCode: "CM1",
        rankInForm: 2
      },
      {
        firstName: "Paul",
        lastName: "Dubois",
        gender: StudentGender.BOY,
        birthDate: createUtcDate(2016, 4, 23),
        levelCode: "CM2",
        rankInForm: 3
      }
    ],
    emailLogs: [
      {
        emailType: EmailType.ACCEPTANCE,
        recipientEmail: "famille.dubois.seed@academie-horizon.test",
        subject: "Académie Horizon - decision d'admission",
        bodySnapshot: "L'admission est confirmee sous reserve de finalisation administrative.",
        sentAt: null,
        sendStatus: EmailSendStatus.PENDING
      }
    ]
  },
  {
    family: {
      fatherLastName: "Roux",
      fatherFirstName: "Damien",
      fatherCity: "Paris",
      motherLastName: "Roux",
      motherFirstName: "Ines",
      motherCity: "Paris",
      familyStatus: "Monoparentale",
      contactEmail: "famille.roux.seed@academie-horizon.test",
      contactPhone: "0600000006",
      postalAddress: "65 boulevard Lefebvre, 75015 Paris",
      googleAccountEmail: null
    },
    application: {
      rawCsvRowHash: "seed-application-roux-2026-06",
      submittedAt: createUtcDate(2026, 2, 19, 13, 50),
      declaredChildrenCount: 2,
      discoverySource: "Google Forms",
      status: ApplicationStatus.IN_REVIEW,
      isPriority: false,
      decisionAt: null,
      decisionNote: null
    },
    students: [
      {
        firstName: "Mila",
        lastName: "Roux",
        gender: StudentGender.GIRL,
        birthDate: createUtcDate(2023, 1, 29),
        levelCode: "PS",
        rankInForm: 1
      },
      {
        firstName: "Noe",
        lastName: "Roux",
        gender: StudentGender.BOY,
        birthDate: createUtcDate(2021, 8, 15),
        levelCode: "GS",
        rankInForm: 2
      }
    ],
    emailLogs: []
  }
];

const ensureLevels = async () => {
  for (const level of LEVELS) {
    await prisma.level.upsert({
      where: { code: level.code },
      update: {
        label: level.label,
        sortOrder: level.sortOrder,
        availablePlaces: level.availablePlaces
      },
      create: level
    });
  }

  const levels = await prisma.level.findMany({
    where: { code: { in: LEVELS.map((level) => level.code) } }
  });

  return new Map(levels.map((level) => [level.code, level.id]));
};

const ensureActiveSchoolYear = async () =>
  prisma.$transaction(async (tx) => {
    const existingSchoolYear = await tx.schoolYear.findUnique({
      where: { label: ACTIVE_SCHOOL_YEAR.label }
    });

    const existingActiveSchoolYear = await tx.schoolYear.findFirst({
      where: { isActive: true },
      select: { id: true }
    });

    if (existingSchoolYear) {
      return tx.schoolYear.update({
        where: { id: existingSchoolYear.id },
        data: {
          startYear: ACTIVE_SCHOOL_YEAR.startYear,
          endYear: ACTIVE_SCHOOL_YEAR.endYear,
          isActive:
            existingSchoolYear.isActive ||
            !existingActiveSchoolYear ||
            existingActiveSchoolYear.id === existingSchoolYear.id
        }
      });
    }

    return tx.schoolYear.create({
      data: {
        ...ACTIVE_SCHOOL_YEAR,
        isActive: existingActiveSchoolYear ? false : ACTIVE_SCHOOL_YEAR.isActive
      }
    });
  });

const ensureFamily = async (tx, familyData) => {
  const existingFamily = await tx.family.findFirst({
    where: { contactEmail: familyData.contactEmail }
  });

  if (existingFamily) {
    return existingFamily;
  }

  return tx.family.create({
    data: familyData
  });
};

const ensureApplicationBundle = async (levelIdsByCode, schoolYearId, seedRecord) => {
  await prisma.$transaction(async (tx) => {
    const family = await ensureFamily(tx, seedRecord.family);

    const existingApplication = await tx.application.findUnique({
      where: { rawCsvRowHash: seedRecord.application.rawCsvRowHash },
      select: { id: true }
    });

    if (existingApplication) {
      return;
    }

    const application = await tx.application.create({
      data: {
        familyId: family.id,
        schoolYearId,
        submittedAt: seedRecord.application.submittedAt,
        declaredChildrenCount: seedRecord.application.declaredChildrenCount,
        discoverySource: seedRecord.application.discoverySource,
        status: seedRecord.application.status,
        isPriority: seedRecord.application.isPriority,
        decisionAt: seedRecord.application.decisionAt,
        decisionNote: seedRecord.application.decisionNote,
        rawCsvRowHash: seedRecord.application.rawCsvRowHash
      }
    });

    await tx.student.createMany({
      data: seedRecord.students.map((student) => {
        const levelId = levelIdsByCode.get(student.levelCode);

        if (!levelId) {
          throw new Error(`Missing seeded level for code ${student.levelCode}.`);
        }

        return {
          applicationId: application.id,
          levelId,
          lastName: student.lastName,
          firstName: student.firstName,
          gender: student.gender,
          birthDate: student.birthDate,
          rankInForm: student.rankInForm
        };
      })
    });

    if (seedRecord.emailLogs.length > 0) {
      await tx.applicationEmailLog.createMany({
        data: seedRecord.emailLogs.map((emailLog) => ({
          applicationId: application.id,
          emailType: emailLog.emailType,
          recipientEmail: emailLog.recipientEmail,
          subject: emailLog.subject,
          bodySnapshot: emailLog.bodySnapshot,
          sentAt: emailLog.sentAt,
          sendStatus: emailLog.sendStatus
        }))
      });
    }
  });
};

const ensureAdminAccount = async () => {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const shouldSyncPassword = isEnvTrue(process.env.SYNC_ADMIN_PASSWORD_ON_SEED);

  if (!email || !password) {
    return null;
  }

  const passwordHash = hashPassword(password);

  return prisma.adminAccount.upsert({
    where: { email: normalizeAdminEmail(email) },
    update: shouldSyncPassword ? { passwordHash } : {},
    create: {
      email: normalizeAdminEmail(email),
      passwordHash
    }
  });
};

const main = async () => {
  const levelIdsByCode = await ensureLevels();
  const schoolYear = await ensureActiveSchoolYear();
  await ensureAdminAccount();
  const shouldSeedDemoData = isEnvTrue(process.env.SEED_DEMO_DATA);

  if (shouldSeedDemoData) {
    for (const seedRecord of APPLICATION_SEEDS) {
      await ensureApplicationBundle(levelIdsByCode, schoolYear.id, seedRecord);
    }
  }

  const [levelCount, activeYearCount, adminCount] = await Promise.all([
    prisma.level.count({ where: { code: { in: LEVELS.map((level) => level.code) } } }),
    prisma.schoolYear.count({ where: { label: ACTIVE_SCHOOL_YEAR.label, isActive: true } }),
    prisma.adminAccount.count()
  ]);

  if (!shouldSeedDemoData) {
    console.log(
      `Seed completed: ${levelCount} levels, ${activeYearCount} active school year, ${adminCount} admin accounts. Demo data skipped.`
    );
    return;
  }

  const [familyCount, applicationCount, studentCount, emailLogCount] = await Promise.all([
    prisma.family.count({
      where: {
        contactEmail: {
          in: APPLICATION_SEEDS.map((seedRecord) => seedRecord.family.contactEmail)
        }
      }
    }),
    prisma.application.count({
      where: {
        rawCsvRowHash: {
          in: APPLICATION_SEEDS.map((seedRecord) => seedRecord.application.rawCsvRowHash)
        }
      }
    }),
    prisma.student.count({
      where: {
        application: {
          rawCsvRowHash: {
            in: APPLICATION_SEEDS.map((seedRecord) => seedRecord.application.rawCsvRowHash)
          }
        }
      }
    }),
    prisma.applicationEmailLog.count({
      where: {
        application: {
          rawCsvRowHash: {
            in: APPLICATION_SEEDS.map((seedRecord) => seedRecord.application.rawCsvRowHash)
          }
        }
      }
    })
  ]);

  console.log(
    `Seed completed: ${levelCount} levels, ${activeYearCount} active school year, ${familyCount} demo families, ${applicationCount} demo applications, ${studentCount} demo students, ${emailLogCount} demo email logs, ${adminCount} admin accounts.`
  );
};

main()
  .catch((error) => {
    console.error("Prisma seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
