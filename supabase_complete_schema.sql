-- ============================================================================
-- SAVOIR+ SÉNÉGAL • SCHÉMA COMPLET SUPABASE POSTGRESQL (PRODUCTION v2.5.2)
-- Aligné sur la structure exacte de la base de données existante
-- Auteur : Massaw Seck (Dakar, Sénégal)
-- ============================================================================
-- Ce script prend en compte l'ensemble des 11 tables existantes :
-- 1. admin_audit_logs
-- 2. ai_tutor_messages
-- 3. app_config
-- 4. app_releases
-- 5. app_settings
-- 6. caisse_transactions (ajout sécurisé de student_uid)
-- 7. class_change_requests
-- 8. courses
-- 9. epreuves_fichiers
-- 10. homework_submissions
-- 11. notifications (id uuid, recipient, sender_email, type, title + compléments)
--
-- Ainsi que les tables fondamentales de l'application :
-- profiles, users, vip_payment_requests, transactions, payment_transactions,
-- assets, app_assets, quizzes, quiz_results, quiz_attempts, tutorials, etc.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS POSTGRESQL & OPÉRATEURS UNIVERSELS TEXT <-> UUID
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.text_eq_uuid(left_val TEXT, right_val UUID)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT left_val = right_val::TEXT;
$$;

CREATE OR REPLACE FUNCTION public.uuid_eq_text(left_val UUID, right_val TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT left_val::TEXT = right_val;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_operator o
    JOIN pg_type t1 ON o.oprleft = t1.oid
    JOIN pg_type t2 ON o.oprright = t2.oid
    WHERE o.oprname = '=' AND t1.typname = 'text' AND t2.typname = 'uuid'
  ) THEN
    CREATE OPERATOR = (
      LEFTARG = text,
      RIGHTARG = uuid,
      PROCEDURE = public.text_eq_uuid,
      COMMUTATOR = =,
      NEGATOR = <>,
      RESTRICT = eqsel,
      JOIN = eqjoinsel
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_operator o
    JOIN pg_type t1 ON o.oprleft = t1.oid
    JOIN pg_type t2 ON o.oprright = t2.oid
    WHERE o.oprname = '=' AND t1.typname = 'uuid' AND t2.typname = 'text'
  ) THEN
    CREATE OPERATOR = (
      LEFTARG = uuid,
      RIGHTARG = text,
      PROCEDURE = public.uuid_eq_text,
      COMMUTATOR = =,
      NEGATOR = <>,
      RESTRICT = eqsel,
      JOIN = eqjoinsel
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. FONCTIONS DE SÉCURITÉ (SÉCURITÉ RLS & ADMIN DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_email(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(TRIM(COALESCE(check_email, ''))) IN (
    'massperpendiculaire@gmail.com',
    'massaw.seck@unchk.edu.sn',
    'massaw.savoirplus@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_email TEXT;
  user_is_admin BOOLEAN;
BEGIN
  -- 1. Vérification directe par le claim JWT
  current_email := NULLIF(current_setting('request.jwt.claim.email', true), '');
  IF current_email IS NOT NULL AND public.is_admin_email(current_email) THEN
    RETURN TRUE;
  END IF;

  -- 2. Vérification dans la table profiles (comparaison textuelle blindée)
  BEGIN
    SELECT (p.is_admin = TRUE OR p.role = 'admin')
    INTO user_is_admin
    FROM public.profiles p
    WHERE (p.id)::text = (auth.uid())::text
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    user_is_admin := FALSE;
  END;

  RETURN COALESCE(user_is_admin, FALSE);
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. TABLE : PROFILES (Profils Apprenants, Enseignants & Admins)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  uid TEXT,
  email TEXT,
  display_name TEXT,
  full_name TEXT,
  prenom TEXT,
  nom TEXT,
  role TEXT DEFAULT 'eleve',
  level TEXT,
  classe TEXT,
  niveau TEXT,
  student_id TEXT,
  matricule TEXT,
  phone TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  photo_url TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  vip_plan TEXT,
  vip_expires_at BIGINT,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'Hors-ligne',
  last_seen BIGINT,
  created_at BIGINT,
  updated_at BIGINT
);

DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uid TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prenom TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nom TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'eleve';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS classe TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS niveau TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matricule TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_plan TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_expires_at BIGINT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Hors-ligne';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen BIGINT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at BIGINT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at BIGINT;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_classe ON public.profiles(classe);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture profils securisee" ON public.profiles;
CREATE POLICY "Lecture profils securisee" ON public.profiles 
  FOR SELECT 
  USING (
    (id)::text = (auth.uid())::text 
    OR public.is_admin()
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Insertion profil propre utilisateur" ON public.profiles;
CREATE POLICY "Insertion profil propre utilisateur" ON public.profiles 
  FOR INSERT 
  WITH CHECK (
    (id)::text = (auth.uid())::text 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Modification profil propre utilisateur" ON public.profiles;
CREATE POLICY "Modification profil propre utilisateur" ON public.profiles 
  FOR UPDATE 
  USING (
    (id)::text = (auth.uid())::text 
    OR public.is_admin()
  )
  WITH CHECK (
    (id)::text = (auth.uid())::text 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Suppression profil propre utilisateur ou admin" ON public.profiles;
CREATE POLICY "Suppression profil propre utilisateur ou admin" ON public.profiles 
  FOR DELETE 
  USING (
    (id)::text = (auth.uid())::text 
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 4. TABLE : USERS (Miroir utilisateur)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  uid TEXT,
  email TEXT,
  display_name TEXT,
  full_name TEXT,
  prenom TEXT,
  nom TEXT,
  role TEXT DEFAULT 'eleve',
  level TEXT,
  classe TEXT,
  student_id TEXT,
  matricule TEXT,
  phone TEXT,
  phone_number TEXT,
  photo_url TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_vip BOOLEAN DEFAULT FALSE,
  created_at BIGINT,
  updated_at BIGINT
);

DO $$
BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS uid TEXT;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS prenom TEXT;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nom TEXT;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS classe TEXT;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture table users" ON public.users;
CREATE POLICY "Lecture table users" ON public.users 
  FOR SELECT USING ((id)::text = (auth.uid())::text OR public.is_admin());

DROP POLICY IF EXISTS "Gestion table users" ON public.users;
CREATE POLICY "Gestion table users" ON public.users 
  FOR ALL USING ((id)::text = (auth.uid())::text OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. TRIGGER : INITIALISATION AUTOMATIQUE SUR AUTH.USERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_raw_name TEXT;
  v_display_name TEXT;
  v_prenom TEXT;
  v_nom TEXT;
  v_is_admin BOOLEAN;
  v_role TEXT;
  v_now BIGINT;
BEGIN
  v_email := LOWER(TRIM(COALESCE(NEW.email, '')));
  v_now := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  
  v_raw_name := TRIM(COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(v_email, '@', 1)
  ));
  
  v_display_name := CASE WHEN v_raw_name = '' THEN 'Élève' ELSE v_raw_name END;
  v_prenom := COALESCE(NEW.raw_user_meta_data->>'prenom', SPLIT_PART(v_display_name, ' ', 1));
  v_nom := COALESCE(NEW.raw_user_meta_data->>'nom', SUBSTRING(v_display_name FROM LENGTH(v_prenom) + 2));

  v_is_admin := public.is_admin_email(v_email) OR (NEW.raw_user_meta_data->>'is_admin')::BOOLEAN = TRUE;
  v_role := CASE WHEN v_is_admin THEN 'admin' ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'eleve') END;

  -- Insertion dans public.profiles (avec support UUID ou TEXT)
  BEGIN
    INSERT INTO public.profiles (
      id, uid, email, display_name, full_name, prenom, nom, role, level, classe,
      is_admin, is_vip, vip_plan, vip_expires_at, is_profile_complete, status, last_seen, created_at, updated_at
    )
    VALUES (
      NEW.id::text, NEW.id::text, v_email, v_display_name, v_display_name, v_prenom, v_nom, v_role,
      CASE WHEN v_is_admin THEN NULL ELSE COALESCE(NEW.raw_user_meta_data->>'level', '3ème') END,
      CASE WHEN v_is_admin THEN NULL ELSE NEW.raw_user_meta_data->>'classe' END,
      v_is_admin, v_is_admin,
      CASE WHEN v_is_admin THEN 'admin' ELSE NULL END,
      CASE WHEN v_is_admin THEN -1 ELSE NULL END,
      v_is_admin, 'En ligne', v_now, v_now, v_now
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      last_seen = v_now,
      updated_at = v_now;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.profiles (
      id, uid, email, display_name, full_name, prenom, nom, role, level, classe,
      is_admin, is_vip, vip_plan, vip_expires_at, is_profile_complete, status, last_seen, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.id::text, v_email, v_display_name, v_display_name, v_prenom, v_nom, v_role,
      CASE WHEN v_is_admin THEN NULL ELSE COALESCE(NEW.raw_user_meta_data->>'level', '3ème') END,
      CASE WHEN v_is_admin THEN NULL ELSE NEW.raw_user_meta_data->>'classe' END,
      v_is_admin, v_is_admin,
      CASE WHEN v_is_admin THEN 'admin' ELSE NULL END,
      CASE WHEN v_is_admin THEN -1 ELSE NULL END,
      v_is_admin, 'En ligne', v_now, v_now, v_now
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      last_seen = v_now,
      updated_at = v_now;
  END;

  -- Insertion dans public.users (miroir)
  BEGIN
    INSERT INTO public.users (
      id, uid, email, display_name, full_name, prenom, nom, role, level, classe,
      is_admin, is_vip, created_at, updated_at
    )
    VALUES (
      NEW.id::text, NEW.id::text, v_email, v_display_name, v_display_name, v_prenom, v_nom, v_role,
      CASE WHEN v_is_admin THEN NULL ELSE COALESCE(NEW.raw_user_meta_data->>'level', '3ème') END,
      CASE WHEN v_is_admin THEN NULL ELSE NEW.raw_user_meta_data->>'classe' END,
      v_is_admin, v_is_admin, v_now, v_now
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.users (
      id, uid, email, display_name, full_name, prenom, nom, role, level, classe,
      is_admin, is_vip, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.id::text, v_email, v_display_name, v_display_name, v_prenom, v_nom, v_role,
      CASE WHEN v_is_admin THEN NULL ELSE COALESCE(NEW.raw_user_meta_data->>'level', '3ème') END,
      CASE WHEN v_is_admin THEN NULL ELSE NEW.raw_user_meta_data->>'classe' END,
      v_is_admin, v_is_admin, v_now, v_now
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 6. TABLE EXISTANTE : ADMIN_AUDIT_LOGS
-- Colonnes : id (text), admin_email (text), action (text), details (text), timestamp (bigint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_email TEXT,
  action TEXT,
  details TEXT,
  timestamp BIGINT
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestion audit logs admin" ON public.admin_audit_logs;
CREATE POLICY "Gestion audit logs admin" ON public.admin_audit_logs 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. TABLE EXISTANTE : AI_TUTOR_MESSAGES
-- Colonnes : id (text), user_uid (text), student_name (text), subject (text),
-- role (text), content (text), attachment_name (text), attachment_type (text),
-- attachment_url (text), created_at (bigint), date_formatted (text)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_tutor_messages (
  id TEXT PRIMARY KEY,
  user_uid TEXT,
  student_name TEXT,
  subject TEXT,
  role TEXT,
  content TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_url TEXT,
  created_at BIGINT,
  date_formatted TEXT
);

ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture messages tuteur IA propriétaire ou admin" ON public.ai_tutor_messages;
CREATE POLICY "Lecture messages tuteur IA propriétaire ou admin" ON public.ai_tutor_messages 
  FOR SELECT USING ((user_uid)::text = (auth.uid())::text OR public.is_admin());

DROP POLICY IF EXISTS "Insertion messages tuteur IA" ON public.ai_tutor_messages;
CREATE POLICY "Insertion messages tuteur IA" ON public.ai_tutor_messages 
  FOR INSERT WITH CHECK ((user_uid)::text = (auth.uid())::text OR public.is_admin() OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Suppression messages tuteur IA" ON public.ai_tutor_messages;
CREATE POLICY "Suppression messages tuteur IA" ON public.ai_tutor_messages 
  FOR DELETE USING ((user_uid)::text = (auth.uid())::text OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. TABLE EXISTANTE : APP_CONFIG
-- Colonnes : id (text), key (text), value (text), reset_at (bigint),
-- updated_at (bigint), global_version (text), published_at (bigint),
-- published_by (text), logo_url (text), app_name (text), official_signature (text)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  id TEXT PRIMARY KEY,
  key TEXT,
  value TEXT,
  reset_at BIGINT,
  updated_at BIGINT,
  global_version TEXT,
  published_at BIGINT,
  published_by TEXT,
  logo_url TEXT,
  app_name TEXT,
  official_signature TEXT
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture app_config publique" ON public.app_config;
CREATE POLICY "Lecture app_config publique" ON public.app_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification app_config admin" ON public.app_config;
CREATE POLICY "Modification app_config admin" ON public.app_config 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. TABLE EXISTANTE : APP_RELEASES
-- Colonnes : id (uuid), version_code (text), apk_url (text), notes (text), created_at (timestamptz)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code TEXT,
  apk_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture app_releases publique" ON public.app_releases;
CREATE POLICY "Lecture app_releases publique" ON public.app_releases FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification app_releases admin" ON public.app_releases;
CREATE POLICY "Modification app_releases admin" ON public.app_releases 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. TABLE EXISTANTE : APP_SETTINGS
-- Colonnes : id (text), current_version (text), force_update (boolean), updated_at (timestamptz)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  current_version TEXT,
  force_update BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture app_settings publique" ON public.app_settings;
CREATE POLICY "Lecture app_settings publique" ON public.app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification app_settings admin" ON public.app_settings;
CREATE POLICY "Modification app_settings admin" ON public.app_settings 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 11. TABLE EXISTANTE : CAISSE_TRANSACTIONS
-- Colonnes actuelles : id (text), student_name (text), phone (text), amount (numeric),
-- motif (text), payment_method (text), note (text), admin_name (text), created_at (bigint), date_formatted (text)
-- AJOUT DE student_uid ET COMPLÉMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caisse_transactions (
  id TEXT PRIMARY KEY,
  student_name TEXT,
  phone TEXT,
  amount NUMERIC,
  motif TEXT,
  payment_method TEXT,
  note TEXT,
  admin_name TEXT,
  created_at BIGINT,
  date_formatted TEXT
);

-- Ajout explicite de student_uid et des colonnes de gestion
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS student_uid TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS operator TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS learner_name TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS registered_by TEXT;
ALTER TABLE public.caisse_transactions ADD COLUMN IF NOT EXISTS date BIGINT;

ALTER TABLE public.caisse_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture caisse etudiant ou admin" ON public.caisse_transactions;
CREATE POLICY "Lecture caisse etudiant ou admin" ON public.caisse_transactions 
  FOR SELECT USING (
    (student_uid)::text = (auth.uid())::text 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Gestion caisse réservée admin" ON public.caisse_transactions;
CREATE POLICY "Gestion caisse réservée admin" ON public.caisse_transactions 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 12. TABLE EXISTANTE : CLASS_CHANGE_REQUESTS
-- Colonnes actuelles : id (text), student_uid (text), student_name (text),
-- student_email (text), matricule (text), current_level (text), requested_level (text),
-- reason (text), status (text), requested_at (bigint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_change_requests (
  id TEXT PRIMARY KEY,
  student_uid TEXT,
  student_name TEXT,
  student_email TEXT,
  matricule TEXT,
  current_level TEXT,
  requested_level TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  requested_at BIGINT
);

ALTER TABLE public.class_change_requests ADD COLUMN IF NOT EXISTS user_uid TEXT;
ALTER TABLE public.class_change_requests ADD COLUMN IF NOT EXISTS student_phone TEXT;
ALTER TABLE public.class_change_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.class_change_requests ADD COLUMN IF NOT EXISTS created_at BIGINT;
ALTER TABLE public.class_change_requests ADD COLUMN IF NOT EXISTS updated_at BIGINT;

ALTER TABLE public.class_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture demandes classe propriétaire ou admin" ON public.class_change_requests;
CREATE POLICY "Lecture demandes classe propriétaire ou admin" ON public.class_change_requests 
  FOR SELECT USING (
    (student_uid)::text = (auth.uid())::text 
    OR (user_uid)::text = (auth.uid())::text 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Insertion demandes classe" ON public.class_change_requests;
CREATE POLICY "Insertion demandes classe" ON public.class_change_requests 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion demandes classe admin" ON public.class_change_requests;
CREATE POLICY "Gestion demandes classe admin" ON public.class_change_requests 
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 13. TABLE EXISTANTE : COURSES
-- Colonnes actuelles : id (text), title (text), level (text), subject (text),
-- chapter (text), summary (text), content (text), pdf_url (text), pdf_file_name (text), created_at (bigint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  pdf_url TEXT,
  pdf_file_name TEXT,
  created_at BIGINT
);

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS video_file_name TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS video_size TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.courses(subject);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture libre des cours" ON public.courses;
CREATE POLICY "Lecture libre des cours" ON public.courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Écriture cours réservée admin" ON public.courses;
CREATE POLICY "Écriture cours réservée admin" ON public.courses FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Documents & Vidéos associés aux cours
CREATE TABLE IF NOT EXISTS public.course_documents (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT,
  file_name TEXT,
  file_size TEXT,
  created_at BIGINT
);
ALTER TABLE public.course_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture documents cours" ON public.course_documents;
CREATE POLICY "Lecture documents cours" ON public.course_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion documents cours admin" ON public.course_documents;
CREATE POLICY "Gestion documents cours admin" ON public.course_documents FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.course_videos (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT,
  file_name TEXT,
  file_size TEXT,
  duration TEXT,
  created_at BIGINT
);
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture vidéos cours" ON public.course_videos;
CREATE POLICY "Lecture vidéos cours" ON public.course_videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion vidéos cours admin" ON public.course_videos;
CREATE POLICY "Gestion vidéos cours admin" ON public.course_videos FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 14. TABLE EXISTANTE : EPREUVES_FICHIERS
-- Colonnes actuelles : id (uuid), titre (text), classe (text), fichier_url (text), created_at (timestamptz)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.epreuves_fichiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT,
  classe TEXT,
  fichier_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.epreuves_fichiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture libre epreuves_fichiers" ON public.epreuves_fichiers;
CREATE POLICY "Lecture libre epreuves_fichiers" ON public.epreuves_fichiers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion epreuves_fichiers admin" ON public.epreuves_fichiers;
CREATE POLICY "Gestion epreuves_fichiers admin" ON public.epreuves_fichiers 
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 15. TABLE EXISTANTE : HOMEWORK_SUBMISSIONS
-- Colonnes actuelles : id (text), student_uid (text), student_name (text),
-- student_email (text), matricule (text), level (text), subject (text), title (text),
-- file_data (text), file_name (text), file_type (text), student_comment (text),
-- status (text), grade20 (numeric), max_grade (numeric), feedback (text),
-- annotated_pdf_data (text), graded_by (text), submitted_at (bigint), graded_at (bigint)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id TEXT PRIMARY KEY,
  student_uid TEXT,
  student_name TEXT,
  student_email TEXT,
  matricule TEXT,
  level TEXT,
  subject TEXT,
  title TEXT,
  file_data TEXT,
  file_name TEXT,
  file_type TEXT,
  student_comment TEXT,
  status TEXT DEFAULT 'pending',
  grade20 NUMERIC,
  max_grade NUMERIC,
  feedback TEXT,
  annotated_pdf_data TEXT,
  graded_by TEXT,
  submitted_at BIGINT,
  graded_at BIGINT
);

ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS file_size TEXT;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS grade NUMERIC;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS annotated_pdf_url TEXT;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS updated_at BIGINT;

ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture devoirs rendus propriétaire ou admin" ON public.homework_submissions;
CREATE POLICY "Lecture devoirs rendus propriétaire ou admin" ON public.homework_submissions 
  FOR SELECT USING ((student_uid)::text = (auth.uid())::text OR public.is_admin());

DROP POLICY IF EXISTS "Insertion devoirs rendus" ON public.homework_submissions;
CREATE POLICY "Insertion devoirs rendus" ON public.homework_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Modification devoirs rendus admin" ON public.homework_submissions;
CREATE POLICY "Modification devoirs rendus admin" ON public.homework_submissions 
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 16. TABLE EXISTANTE : NOTIFICATIONS
-- Colonnes actuelles : id (uuid), recipient (text), sender_email (text), type (text), title (text)
-- COMPLÉMENTS POUR LE CENTRE DE NOTIFICATIONS TEMPS RÉEL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT,
  sender_email TEXT,
  type TEXT DEFAULT 'general',
  title TEXT NOT NULL
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_uid TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_uid TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'eleve';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_level TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_tab TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_sub_tab TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_item_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at BIGINT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS date_formatted TEXT;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture notifications destinataire ou admin" ON public.notifications;
CREATE POLICY "Lecture notifications destinataire ou admin" ON public.notifications 
  FOR SELECT USING (
    (recipient)::text = (auth.uid())::text 
    OR (target_uid)::text = (auth.uid())::text 
    OR (user_uid)::text = (auth.uid())::text 
    OR target_role = 'all' 
    OR (target_role = 'admin' AND public.is_admin())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Insertion notifications" ON public.notifications;
CREATE POLICY "Insertion notifications" ON public.notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Modification notifications destinataire ou admin" ON public.notifications;
CREATE POLICY "Modification notifications destinataire ou admin" ON public.notifications 
  FOR UPDATE USING (
    (recipient)::text = (auth.uid())::text 
    OR (target_uid)::text = (auth.uid())::text 
    OR (user_uid)::text = (auth.uid())::text 
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 17. TABLE : VIP_PAYMENT_REQUESTS (Demandes d'activation Pass VIP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vip_payment_requests (
  id TEXT PRIMARY KEY,
  student_uid TEXT,
  student_name TEXT,
  student_phone TEXT,
  level TEXT,
  plan_id TEXT,
  operator TEXT,
  transaction_ref TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'PENDING',
  rejection_reason TEXT,
  requested_at BIGINT,
  updated_at BIGINT
);

ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS student_uid TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS student_phone TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS operator TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS requested_at BIGINT;
ALTER TABLE public.vip_payment_requests ADD COLUMN IF NOT EXISTS updated_at BIGINT;

ALTER TABLE public.vip_payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture demandes VIP propriétaire ou admin" ON public.vip_payment_requests;
CREATE POLICY "Lecture demandes VIP propriétaire ou admin" ON public.vip_payment_requests 
  FOR SELECT USING ((student_uid)::text = (auth.uid())::text OR public.is_admin());

DROP POLICY IF EXISTS "Insertion demandes VIP" ON public.vip_payment_requests;
CREATE POLICY "Insertion demandes VIP" ON public.vip_payment_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Modification demandes VIP admin" ON public.vip_payment_requests;
CREATE POLICY "Modification demandes VIP admin" ON public.vip_payment_requests 
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 18. TABLES : TRANSACTIONS & PAYMENT_TRANSACTIONS (Wave & Orange Money)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  student_uid TEXT,
  student_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  amount NUMERIC,
  type TEXT,
  operator TEXT,
  status TEXT DEFAULT 'pending',
  reference TEXT,
  description TEXT,
  created_at BIGINT
);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS student_uid TEXT;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture transactions propriétaire ou admin" ON public.transactions;
CREATE POLICY "Lecture transactions propriétaire ou admin" ON public.transactions 
  FOR SELECT USING ((student_uid)::text = (auth.uid())::text OR public.is_admin());

DROP POLICY IF EXISTS "Insertion transactions" ON public.transactions;
CREATE POLICY "Insertion transactions" ON public.transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Modification transactions admin" ON public.transactions;
CREATE POLICY "Modification transactions admin" ON public.transactions 
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  user_uid TEXT,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  learner_name TEXT,
  amount NUMERIC,
  type TEXT,
  payment_type TEXT,
  operator TEXT,
  status TEXT DEFAULT 'pending',
  phone_number TEXT,
  date_formatted TEXT,
  created_at BIGINT
);
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS user_uid TEXT;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture payment_transactions" ON public.payment_transactions;
CREATE POLICY "Lecture payment_transactions" ON public.payment_transactions 
  FOR SELECT USING ((user_uid)::text = (auth.uid())::text OR public.is_admin());

DROP POLICY IF EXISTS "Gestion payment_transactions" ON public.payment_transactions;
CREATE POLICY "Gestion payment_transactions" ON public.payment_transactions FOR ALL USING (true);

-- ----------------------------------------------------------------------------
-- 19. TABLES : ASSETS (Fiches TD, Examens & Corrigés)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY,
  asset_id TEXT,
  parent_id TEXT,
  name TEXT,
  title TEXT,
  type TEXT,
  size TEXT,
  storage_path TEXT,
  download_url TEXT,
  is_cached_offline BOOLEAN DEFAULT FALSE,
  level TEXT,
  subject TEXT,
  category TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_assets_level_subject ON public.assets(level, subject);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture assets libre" ON public.assets;
CREATE POLICY "Lecture assets libre" ON public.assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion assets admin" ON public.assets;
CREATE POLICY "Gestion assets admin" ON public.assets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.app_assets (
  id TEXT PRIMARY KEY,
  asset_id TEXT,
  name TEXT,
  type TEXT,
  size TEXT,
  download_url TEXT,
  level TEXT,
  subject TEXT,
  created_at BIGINT
);
ALTER TABLE public.app_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture app_assets libre" ON public.app_assets;
CREATE POLICY "Lecture app_assets libre" ON public.app_assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion app_assets admin" ON public.app_assets;
CREATE POLICY "Gestion app_assets admin" ON public.app_assets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 20. TABLES : QUIZZES & ÉVALUATIONS INTERACTIVES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  chapter TEXT,
  time_limit_minutes INTEGER DEFAULT 20,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at BIGINT
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture des QCM" ON public.quizzes;
CREATE POLICY "Lecture des QCM" ON public.quizzes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion des QCM admin" ON public.quizzes;
CREATE POLICY "Gestion des QCM admin" ON public.quizzes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  student_name TEXT,
  quiz_id TEXT,
  quiz_title TEXT,
  subject TEXT,
  level TEXT,
  score_percentage NUMERIC,
  score_20 NUMERIC,
  total_questions INTEGER,
  correct_answers INTEGER,
  question_reviews JSONB,
  timestamp BIGINT,
  created_at BIGINT
);
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture des résultats de quiz" ON public.quiz_results;
CREATE POLICY "Lecture des résultats de quiz" ON public.quiz_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertion des résultats de quiz" ON public.quiz_results;
CREATE POLICY "Insertion des résultats de quiz" ON public.quiz_results FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id TEXT PRIMARY KEY,
  user_uid TEXT,
  student_id TEXT,
  quiz_id TEXT,
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  answers JSONB,
  passed BOOLEAN,
  completed_at BIGINT,
  created_at BIGINT
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture tentatives quiz" ON public.quiz_attempts;
CREATE POLICY "Lecture tentatives quiz" ON public.quiz_attempts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertion tentatives quiz" ON public.quiz_attempts;
CREATE POLICY "Insertion tentatives quiz" ON public.quiz_attempts FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 21. TABLES : PARAMÈTRES SYSTÈME (TABLE PRINCIPALE SYSTEM_SETTINGS) & TUTORIELS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  
  -- 1. IDENTITÉ
  app_name TEXT DEFAULT 'Génie Mentor Académie (GMA)',
  short_name TEXT DEFAULT 'GMA',
  description TEXT DEFAULT 'Plateforme éducative d''excellence du Sénégal - Cours, Quiz, Annales et Tuteur IA 100% Hors-Ligne',
  
  -- 2. CHARTE GRAPHIQUE (HEX CODES)
  primary_color TEXT DEFAULT '#1A237E',
  secondary_color TEXT DEFAULT '#3949AB',
  accent_color TEXT DEFAULT '#F59E0B',
  
  -- 3. MÉDIAS & RESSOURCES
  favicon_url TEXT DEFAULT '/logo-192.png',
  pwa_icon_url TEXT DEFAULT '/logo.png',
  logo_url TEXT DEFAULT '/logo.png',
  admin_signature_url TEXT DEFAULT '/app-signature.png',
  official_signature TEXT DEFAULT '/app-signature.png',
  
  -- 4. OPÉRATIONS & PAIEMENTS
  registration_status TEXT DEFAULT 'open',
  wave_merchant_number TEXT DEFAULT '78 376 95 84',
  om_merchant_number TEXT DEFAULT '78 376 95 84',
  payment_guide TEXT DEFAULT 'Pour valider votre inscription ou votre Pass VIP, effectuez votre transfert Wave ou Orange Money vers l''un des numéros marchands officiels ci-dessus, puis saisissez la référence.',
  
  -- 5. COMMUNICATION
  whatsapp_support TEXT DEFAULT '+221 78 376 95 84',
  support_phone TEXT DEFAULT '+221 78 376 95 84',
  support_email TEXT DEFAULT 'massaw.seck@unchk.edu.sn',
  community_url TEXT DEFAULT 'https://chat.whatsapp.com/GMA-Excellence-Senegal',
  announcement_banner TEXT DEFAULT 'Bienvenue sur Génie Mentor Académie (GMA) ! Les inscriptions et répétitions d''élite sont ouvertes.',
  announcement_text TEXT DEFAULT 'Bienvenue sur Génie Mentor Académie (GMA) ! Les inscriptions et répétitions d''élite sont ouvertes.',
  announcement_banner_active BOOLEAN DEFAULT true,

  -- MISES À JOUR & FICHIER APK
  latest_version TEXT DEFAULT '1.0.2',
  version TEXT DEFAULT '1.0.2',
  app_version TEXT DEFAULT '1.0.2',
  apk_url TEXT,
  message TEXT,
  
  -- JSON EXTENSIBLE & AUDIT
  settings_json JSONB,
  updated_at BIGINT,
  updated_by TEXT DEFAULT 'Admin'
);

-- Migrations douces pour ajouter les colonnes si la table existait déjà
DO $$
BEGIN
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'Génie Mentor Académie (GMA)';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS short_name TEXT DEFAULT 'GMA';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1A237E';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#3949AB';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#F59E0B';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '/logo-192.png';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS pwa_icon_url TEXT DEFAULT '/logo.png';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/logo.png';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS admin_signature_url TEXT DEFAULT '/app-signature.png';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS official_signature TEXT DEFAULT '/app-signature.png';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'open';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS wave_merchant_number TEXT DEFAULT '78 376 95 84';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS om_merchant_number TEXT DEFAULT '78 376 95 84';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS payment_guide TEXT;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS whatsapp_support TEXT DEFAULT '+221 78 376 95 84';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS support_phone TEXT DEFAULT '+221 78 376 95 84';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'massaw.seck@unchk.edu.sn';
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS community_url TEXT;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS announcement_banner TEXT;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS announcement_text TEXT;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS announcement_banner_active BOOLEAN DEFAULT true;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS settings_json JSONB;
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'Admin';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique system_settings" ON public.system_settings;
CREATE POLICY "Lecture publique system_settings" ON public.system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification system_settings admin" ON public.system_settings;
CREATE POLICY "Modification system_settings admin" ON public.system_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.system_settings (id, latest_version, version, app_name, short_name, primary_color, secondary_color, accent_color, registration_status, updated_at)
VALUES ('main', '1.0.2', '1.0.2', 'Génie Mentor Académie (GMA)', 'GMA', '#1A237E', '#3949AB', '#F59E0B', 'open', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
ON CONFLICT (id) DO UPDATE SET
  app_name = EXCLUDED.app_name,
  short_name = EXCLUDED.short_name,
  primary_color = COALESCE(public.system_settings.primary_color, EXCLUDED.primary_color),
  secondary_color = COALESCE(public.system_settings.secondary_color, EXCLUDED.secondary_color),
  accent_color = COALESCE(public.system_settings.accent_color, EXCLUDED.accent_color),
  updated_at = EXCLUDED.updated_at;

CREATE TABLE IF NOT EXISTS public.tutorials (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  video_url TEXT,
  duration TEXT,
  target_audience TEXT,
  level TEXT,
  subject TEXT,
  category TEXT,
  created_at BIGINT
);
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture tutos libre" ON public.tutorials;
CREATE POLICY "Lecture tutos libre" ON public.tutorials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion tutos admin" ON public.tutorials;
CREATE POLICY "Gestion tutos admin" ON public.tutorials FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 22. FONCTIONS RPC UTILISÉES PAR L'APPLICATION FRONTEND
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_change_student_class(
  target_student_id TEXT,
  new_class_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Action non autorisée. Réservée aux administrateurs.';
  END IF;

  UPDATE public.profiles
  SET 
    level = new_class_name,
    classe = new_class_name,
    niveau = new_class_name,
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE (id)::text = target_student_id OR (uid)::text = target_student_id;

  UPDATE public.users
  SET 
    level = new_class_name,
    classe = new_class_name,
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE (id)::text = target_student_id OR (uid)::text = target_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_class_change(
  request_id TEXT,
  student_id TEXT,
  new_class_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Action non autorisée. Réservée aux administrateurs.';
  END IF;

  UPDATE public.class_change_requests
  SET 
    status = 'approved',
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE id = request_id;

  UPDATE public.profiles
  SET 
    level = new_class_name,
    classe = new_class_name,
    niveau = new_class_name,
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE (id)::text = student_id OR (uid)::text = student_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 23. STOCKAGE SUPABASE STORAGE (BUCKETS & POLITIQUES RLS)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES 
    ('avatars', 'avatars', true),
    ('homework', 'homework', true),
    ('receipts', 'receipts', true),
    ('assets', 'assets', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "Lecture publique des buckets Savoir+" ON storage.objects;
CREATE POLICY "Lecture publique des buckets Savoir+" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'homework', 'receipts', 'assets'));

DROP POLICY IF EXISTS "Upload authentifié ou admin dans les buckets" ON storage.objects;
CREATE POLICY "Upload authentifié ou admin dans les buckets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('avatars', 'homework', 'receipts', 'assets')
    AND (auth.role() = 'authenticated' OR public.is_admin())
  );

DROP POLICY IF EXISTS "Suppression d'objets par admin ou propriétaire" ON storage.objects;
CREATE POLICY "Suppression d'objets par admin ou propriétaire" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('avatars', 'homework', 'receipts', 'assets')
    AND ((owner)::text = (auth.uid())::text OR public.is_admin())
  );

-- ----------------------------------------------------------------------------
-- 24. ACTIVATION DU TEMPS RÉEL (SUPABASE REALTIME)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.courses; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.vip_payment_requests; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.class_change_requests; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_submissions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.caisse_transactions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_tutor_messages; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ============================================================================
-- FIN DU SCRIPT • SCHÉMA ADAPTÉ ET POLITIQUES RLS 100% VALIDES
-- ============================================================================
