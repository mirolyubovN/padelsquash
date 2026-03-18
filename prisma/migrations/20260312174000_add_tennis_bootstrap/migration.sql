DO $$
DECLARE
  v_location_id TEXT;
  v_tennis_sport_id TEXT;
BEGIN
  SELECT "id"
  INTO v_location_id
  FROM "Location"
  WHERE "slug" = 'main'
  LIMIT 1;

  IF v_location_id IS NULL THEN
    SELECT "id"
    INTO v_location_id
    FROM "Location"
    ORDER BY "sortOrder" ASC, "createdAt" ASC
    LIMIT 1;
  END IF;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'Cannot bootstrap tennis data: no location found';
  END IF;

  INSERT INTO "Sport" ("id", "slug", "name", "active", "sortOrder", "createdAt", "updatedAt")
  VALUES ('sport_tennis', 'tennis', 'Теннис', true, 30, NOW(), NOW())
  ON CONFLICT ("slug") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "active" = EXCLUDED."active",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = NOW();

  SELECT "id"
  INTO v_tennis_sport_id
  FROM "Sport"
  WHERE "slug" = 'tennis'
  LIMIT 1;

  IF v_tennis_sport_id IS NULL THEN
    RAISE EXCEPTION 'Cannot bootstrap tennis data: tennis sport missing';
  END IF;

  INSERT INTO "Service" (
    "id",
    "code",
    "name",
    "sportId",
    "requiresCourt",
    "requiresInstructor",
    "active",
    "createdAt",
    "updatedAt"
  )
  VALUES
    (
      'service_tennis_rental',
      'tennis-rental',
      'Аренда корта (теннис)',
      v_tennis_sport_id,
      true,
      false,
      true,
      NOW(),
      NOW()
    ),
    (
      'service_tennis_coaching',
      'tennis-coaching',
      'Тренировка с тренером (теннис)',
      v_tennis_sport_id,
      true,
      true,
      true,
      NOW(),
      NOW()
    )
  ON CONFLICT ("code") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "sportId" = EXCLUDED."sportId",
    "requiresCourt" = EXCLUDED."requiresCourt",
    "requiresInstructor" = EXCLUDED."requiresInstructor",
    "active" = EXCLUDED."active",
    "updatedAt" = NOW();

  INSERT INTO "ComponentPrice" (
    "id",
    "locationId",
    "sportId",
    "componentType",
    "period",
    "currency",
    "amount",
    "createdAt",
    "updatedAt"
  )
  SELECT
    'cp_tennis_' || v."componentType" || '_' || v."period",
    v_location_id,
    v_tennis_sport_id,
    v."componentType"::"PriceComponentType",
    v."period"::"PricingPeriod",
    'KZT',
    v."amount",
    NOW(),
    NOW()
  FROM (
    VALUES
      ('court', 'morning', 14000::NUMERIC),
      ('court', 'day', 14000::NUMERIC),
      ('court', 'evening_weekend', 19000::NUMERIC),
      ('instructor', 'morning', 10000::NUMERIC),
      ('instructor', 'day', 11000::NUMERIC),
      ('instructor', 'evening_weekend', 12000::NUMERIC)
  ) AS v("componentType", "period", "amount")
  ON CONFLICT ("locationId", "sportId", "componentType", "period", "currency") DO UPDATE
  SET
    "amount" = EXCLUDED."amount",
    "updatedAt" = NOW();

  INSERT INTO "Court" (
    "id",
    "name",
    "sportId",
    "locationId",
    "active",
    "notes",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    'court_tennis_1',
    'Теннис 1',
    v_tennis_sport_id,
    v_location_id,
    true,
    'Открытый hard-корт. Подходит для тренировок и матчевых игр.',
    NOW(),
    NOW()
  )
  ON CONFLICT ("id") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "sportId" = EXCLUDED."sportId",
    "locationId" = EXCLUDED."locationId",
    "active" = EXCLUDED."active",
    "notes" = EXCLUDED."notes",
    "updatedAt" = NOW();

  INSERT INTO "Instructor" (
    "id",
    "name",
    "bio",
    "photoUrl",
    "active",
    "createdAt",
    "updatedAt"
  )
  VALUES
    (
      'instructor_tennis_1',
      'Марат Тлеков',
      'Теннис: постановка техники ударов, передвижение и матчевые розыгрыши.',
      NULL,
      true,
      NOW(),
      NOW()
    ),
    (
      'instructor_tennis_2',
      'Егор Сидоров',
      'Теннис: индивидуальные тренировки, тактика игры и соревновательная практика.',
      NULL,
      true,
      NOW(),
      NOW()
    )
  ON CONFLICT ("id") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "bio" = EXCLUDED."bio",
    "photoUrl" = COALESCE(EXCLUDED."photoUrl", "Instructor"."photoUrl"),
    "active" = EXCLUDED."active",
    "updatedAt" = NOW();

  INSERT INTO "InstructorSport" ("id", "instructorId", "sportId", "pricePerHour")
  VALUES
    ('insport_tennis_1', 'instructor_tennis_1', v_tennis_sport_id, 12500),
    ('insport_tennis_2', 'instructor_tennis_2', v_tennis_sport_id, 14000)
  ON CONFLICT ("instructorId", "sportId") DO UPDATE
  SET
    "pricePerHour" = EXCLUDED."pricePerHour";

  INSERT INTO "InstructorLocation" ("id", "instructorId", "locationId", "active")
  VALUES
    ('inloc_tennis_1', 'instructor_tennis_1', v_location_id, true),
    ('inloc_tennis_2', 'instructor_tennis_2', v_location_id, true)
  ON CONFLICT ("instructorId", "locationId") DO UPDATE
  SET
    "active" = true;

  DELETE FROM "ResourceSchedule"
  WHERE "resourceType" = 'instructor'::"ScheduleResourceType"
    AND "resourceId" IN ('instructor_tennis_1', 'instructor_tennis_2')
    AND "weekStart" IS NULL;

  INSERT INTO "ResourceSchedule" (
    "id",
    "resourceType",
    "resourceId",
    "dayOfWeek",
    "startTime",
    "endTime",
    "active",
    "sportId"
  )
  SELECT
    'rs_' || md5(i."instructorId" || ':' || d::TEXT || ':tennis'),
    'instructor'::"ScheduleResourceType",
    i."instructorId",
    d,
    '08:00',
    '23:00',
    true,
    v_tennis_sport_id
  FROM (
    VALUES ('instructor_tennis_1'), ('instructor_tennis_2')
  ) AS i("instructorId")
  CROSS JOIN generate_series(0, 6) AS d;
END $$;
