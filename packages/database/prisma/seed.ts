import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL em falta.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const boats = JSON.parse(
  await readFile(new URL("./seed-data/boats.json", import.meta.url), "utf8"),
) as Array<Record<string, any>>;
const stages = JSON.parse(
  await readFile(new URL("./seed-data/stages.json", import.meta.url), "utf8"),
) as Array<Record<string, any>>;

function normalizeIdentifier(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function main() {
  const roles = [
    ["PARTICIPANT", "Participante"],
    ["EDITOR", "Editor de conteúdos"],
    ["RESULTS_MANAGER", "Gestor de resultados"],
    ["MODERATOR", "Moderador"],
    ["ADMIN", "Administrador"],
    ["SUPERADMIN", "Superadministrador"],
  ] as const;

  for (const [code, name] of roles) {
    await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }

  const officialCities = [
    ["gaia", "Gaia"],
    ["figueira-da-foz", "Figueira da Foz"],
    ["lisboa", "Lisboa"],
    ["cascais", "Cascais"],
    ["sines", "Sines"],
    ["portimao", "Portimão"],
  ] as const;
  for (const [slug, name] of officialCities) {
    await prisma.city.upsert({
      where: { slug },
      update: { name, countryCode: "PT", active: true },
      create: { slug, name, countryCode: "PT" },
    });
  }

  const anc = await prisma.raceClass.upsert({
    where: { code: "ANC" },
    update: { name: "ANC", active: true },
    create: { code: "ANC", name: "ANC" },
  });
  const orc = await prisma.raceClass.upsert({
    where: { code: "ORC" },
    update: { name: "ORC", active: true },
    create: { code: "ORC", name: "ORC" },
  });
  const ancA = await prisma.raceClass.upsert({
    where: { code: "ANC-A" },
    update: { name: "ANC-A", parentId: anc.id, active: true },
    create: { code: "ANC-A", name: "ANC-A", parentId: anc.id },
  });
  const ancB = await prisma.raceClass.upsert({
    where: { code: "ANC-B" },
    update: { name: "ANC-B", parentId: anc.id, active: true },
    create: { code: "ANC-B", name: "ANC-B", parentId: anc.id },
  });
  const classMap = new Map([
    ["ANC", anc.id],
    ["ORC", orc.id],
    ["ANC-A", ancA.id],
    ["ANC-B", ancB.id],
  ]);

  const boatIds = new Map<string, string>();
  for (const item of boats) {
    const classId = classMap.get(item.classCode);
    if (!classId) throw new Error(`Classe desconhecida: ${item.classCode}`);

    const boat = await prisma.boat.upsert({
      where: { registrationId: item.registrationId },
      update: {
        boatNumber: item.boatNumber,
        publicName: item.publicName,
        technicalName: item.technicalName,
        classId,
        sourceAuditVersion: item.sourceAuditVersion,
      },
      create: {
        registrationId: item.registrationId,
        boatNumber: item.boatNumber,
        publicName: item.publicName,
        technicalName: item.technicalName,
        classId,
        sourceAuditVersion: item.sourceAuditVersion,
      },
    });
    boatIds.set(item.publicName, boat.id);

    await prisma.boatIdentifier.upsert({
      where: {
        type_normalizedValue: {
          type: "BOAT_NUMBER",
          normalizedValue: normalizeIdentifier(item.boatNumber),
        },
      },
      update: { boatId: boat.id, value: item.boatNumber, isCurrent: true },
      create: {
        boatId: boat.id,
        type: "BOAT_NUMBER",
        value: item.boatNumber,
        normalizedValue: normalizeIdentifier(item.boatNumber),
        source: "Excel oficial confirmado — auditoria Fase 0",
      },
    });

    await prisma.boatIdentifier.upsert({
      where: {
        type_normalizedValue: {
          type: "REGISTRATION_ID",
          normalizedValue: normalizeIdentifier(item.registrationId),
        },
      },
      update: { boatId: boat.id, value: item.registrationId, isCurrent: true },
      create: {
        boatId: boat.id,
        type: "REGISTRATION_ID",
        value: item.registrationId,
        normalizedValue: normalizeIdentifier(item.registrationId),
        source: "Lista de inscritos",
      },
    });

    if (item.sail?.display) {
      await prisma.boatIdentifier.upsert({
        where: {
          type_normalizedValue: {
            type: "SAIL_NUMBER",
            normalizedValue: normalizeIdentifier(item.sail.display),
          },
        },
        update: {
          boatId: boat.id,
          value: item.sail.display,
          countryCode: item.sail.country_code,
          suffix: item.sail.suffix,
          isCurrent: true,
        },
        create: {
          boatId: boat.id,
          type: "SAIL_NUMBER",
          value: item.sail.display,
          normalizedValue: normalizeIdentifier(item.sail.display),
          countryCode: item.sail.country_code,
          suffix: item.sail.suffix,
          source: "Certificado ANC/ORC — auditoria Fase 0",
        },
      });
    }

    const names = new Set([item.publicName, item.technicalName, ...(item.aliases ?? [])]);
    for (const name of names) {
      if (!name) continue;
      const type = name === item.publicName ? "PUBLIC" : name === item.technicalName ? "TECHNICAL" : "ALIAS";
      await prisma.boatName.upsert({
        where: { boatId_type_name: { boatId: boat.id, type, name } },
        update: { isCurrent: true },
        create: { boatId: boat.id, type, name, source: "Auditoria Fase 0" },
      });
    }

    const certificate = item.certificate;
    if (certificate?.source_files?.length) {
      const statusMap: Record<string, any> = {
        valid: "VALID",
        expired: "EXPIRED",
        missing: "MISSING",
        valid_evidence_but_pdf_missing: "PENDING",
      };
      const existing = await prisma.boatCertificate.findFirst({
        where: { boatId: boat.id, type: certificate.type, isCurrent: true },
      });
      const data = {
        boatId: boat.id,
        type: certificate.type,
        reference: certificate.reference,
        model: certificate.model,
        ratingType: certificate.rating_type,
        ratingValue: certificate.rating_value ? certificate.rating_value : null,
        issuedAt: certificate.issued_at ? new Date(`${certificate.issued_at}T00:00:00Z`) : null,
        validUntil: certificate.valid_until ? new Date(`${certificate.valid_until}T00:00:00Z`) : null,
        status: statusMap[certificate.status] ?? "PENDING",
        sourceFiles: certificate.source_files,
        sourceHashes: certificate.source_sha256,
        notes: item.conflicts?.length ? item.conflicts.join("; ") : null,
      };
      if (existing) {
        await prisma.boatCertificate.update({ where: { id: existing.id }, data });
      } else {
        await prisma.boatCertificate.create({ data });
      }
    }
  }

  const rootClasses = [anc, orc];
  const stageIds = new Map<number, string>();
  for (const item of stages) {
    const stage = await prisma.stage.upsert({
      where: { number: item.number },
      update: {
        slug: item.slug,
        name: item.name,
        raceType: item.raceType,
        startLocation: item.startLocation,
        finishLocation: item.finishLocation,
        stageDate: new Date(`${item.stageDate}T00:00:00Z`),
      },
      create: {
        number: item.number,
        slug: item.slug,
        name: item.name,
        raceType: item.raceType,
        startLocation: item.startLocation,
        finishLocation: item.finishLocation,
        stageDate: new Date(`${item.stageDate}T00:00:00Z`),
        status: "DRAFT",
      },
    });
    stageIds.set(item.number, stage.id);
    for (const raceClass of rootClasses) {
      await prisma.stageClass.upsert({
        where: { stageId_classId: { stageId: stage.id, classId: raceClass.id } },
        update: { active: true },
        create: { stageId: stage.id, classId: raceClass.id, active: true },
      });
    }
  }

  for (const item of stages) {
    const stageId = stageIds.get(item.number);
    if (!stageId) continue;
    for (const raceClass of rootClasses) {
      await prisma.predictionMarket.upsert({
        where: { stageId_classId: { stageId, classId: raceClass.id } },
        update: {
          code: `${item.slug}-${raceClass.code.toLowerCase()}`,
          status: "DRAFT",
          maxPodiumPosition: 3,
          allowSurpriseInPodium: false,
        },
        create: {
          stageId,
          classId: raceClass.id,
          code: `${item.slug}-${raceClass.code.toLowerCase()}`,
          status: "DRAFT",
          maxPodiumPosition: 3,
          allowSurpriseInPodium: false,
        },
      });
    }
  }

  for (const item of boats) {
    const boatId = boatIds.get(item.publicName);
    if (!boatId) continue;
    for (let number = 1; number <= 8; number += 1) {
      if (!item.participation?.[`stage_${number}`]) continue;
      const stageId = stageIds.get(number);
      if (!stageId) continue;
      await prisma.stageBoat.upsert({
        where: { stageId_boatId: { stageId, boatId } },
        update: { eligibleForPrediction: true },
        create: {
          stageId,
          boatId,
          participationSource: "Auditoria Fase 0 — matriz de participação",
        },
      });
    }
  }

  const scoringRuleSet = await prisma.scoringRuleSet.upsert({
    where: { code_version: { code: "MVP_2026", version: 1 } },
    update: { name: "Pontuação MVP 2026", active: true },
    create: { code: "MVP_2026", version: 1, name: "Pontuação MVP 2026", active: true },
  });
  const scoringRules = [
    ["WINNER_EXACT", 100],
    ["PODIUM_EXACT_SECOND", 75],
    ["PODIUM_EXACT_THIRD", 75],
    ["PODIUM_WRONG_POSITION", 40],
    ["SURPRISE_TOP_FIVE", 60],
    ["SPECIAL_QUESTION_CORRECT", 50],
    ["ALL_ELIGIBLE_STAGES_BONUS", 100],
  ] as const;
  for (const [code, points] of scoringRules) {
    await prisma.scoringRule.upsert({
      where: { ruleSetId_code: { ruleSetId: scoringRuleSet.id, code } },
      update: { points, active: true },
      create: { ruleSetId: scoringRuleSet.id, code, points, active: true },
    });
  }
  await prisma.predictionMarket.updateMany({
    where: { scoringRuleSetId: null },
    data: { scoringRuleSetId: scoringRuleSet.id },
  });

  const settings = [
    ["timezone", "Europe/Lisbon", "Fuso horário de apresentação"],
    ["official_wording_enabled", false, "Controla a utilização da expressão jogo oficial"],
    ["game_launch_stage", { stage: null }, "Etapa a partir da qual o jogo aceita previsões"],
    ["audit_source_version", "1.2.0", "Versão da auditoria utilizada no seed"],
    ["phase2_schema_version", "1.0.0", "Versão do domínio de previsões"],
    ["phase3_schema_version", "1.0.0", "Versão do domínio de resultados, pontuação e rankings"],
    ["community_ranking_methodology", { method: "average_top_10", minimum: 1 }, "Método das classificações por comunidade"],
  ] as const;
  for (const [key, value, description] of settings) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  const flags = [
    ["public_game_enabled", false],
    ["registrations_enabled", false],
    ["predictions_enabled", false],
    ["profiles_enabled", true],
    ["preclose_stats_enabled", false],
    ["sailti_sync_enabled", false],
    ["result_imports_enabled", false],
    ["results_enabled", false],
    ["rankings_enabled", false],
    ["missions_enabled", false],
  ] as const;
  for (const [key, enabled] of flags) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, enabled },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) throw new Error("SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");
    const passwordHash = await hash(adminPassword);
    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: "SUPERADMIN" } });
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash, status: "ACTIVE", emailVerifiedAt: new Date() },
      create: {
        email: adminEmail,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            name: process.env.SEED_ADMIN_NAME || "Administrador",
            nickname: "admin",
          },
        },
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: superAdminRole.id },
    });
  }

  console.log(`Seed concluído: ${boats.length} embarcações, ${stages.length} etapas, ${stages.length * 2} mercados e regras de pontuação MVP 2026.`);
}

main()
  .finally(async () => prisma.$disconnect());
