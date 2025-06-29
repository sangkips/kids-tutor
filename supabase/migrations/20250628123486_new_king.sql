/*
  # Reading Buddy App Database Schema

  1. New Tables
    - `profiles` - User profiles with learning statistics
    - `learning_sessions` - Individual learning session records
    - `word_progress` - Progress tracking for individual words
    - `achievements` - User achievements and badges
    - `daily_goals` - Daily learning goals and progress
    - `app_settings` - User app preferences and settings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for real-time subscriptions

  3. Functions
    - Update user statistics after each session
    - Check and award achievements
    - Calculate streaks and accuracy rates
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  age integer,
  level integer DEFAULT 1,
  total_words_learned integer DEFAULT 0,
  total_practice_time integer DEFAULT 0,
  accuracy_rate numeric(5,2) DEFAULT 0.00,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create learning_sessions table
CREATE TABLE IF NOT EXISTS learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_type text CHECK (session_type IN ('chat', 'practice')) NOT NULL,
  words_practiced text[] DEFAULT '{}',
  correct_pronunciations integer DEFAULT 0,
  total_attempts integer DEFAULT 0,
  session_duration integer DEFAULT 0,
  accuracy_rate numeric(5,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now()
);

-- Create word_progress table
CREATE TABLE IF NOT EXISTS word_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  word text NOT NULL,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  times_practiced integer DEFAULT 0,
  times_correct integer DEFAULT 0,
  last_practiced timestamptz DEFAULT now(),
  mastery_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  earned_at timestamptz DEFAULT now()
);

-- Create daily_goals table
CREATE TABLE IF NOT EXISTS daily_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_type text CHECK (goal_type IN ('words', 'time', 'accuracy')) NOT NULL,
  target_value integer NOT NULL,
  current_value integer DEFAULT 0,
  goal_date date DEFAULT CURRENT_DATE,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, goal_type, goal_date)
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sound_enabled boolean DEFAULT true,
  notifications_enabled boolean DEFAULT true,
  dark_mode boolean DEFAULT false,
  speech_rate numeric(3,1) DEFAULT 0.7,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  daily_word_goal integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for learning_sessions
CREATE POLICY "Users can read own sessions"
  ON learning_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON learning_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for word_progress
CREATE POLICY "Users can read own word progress"
  ON word_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word progress"
  ON word_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word progress"
  ON word_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for achievements
CREATE POLICY "Users can read own achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for daily_goals
CREATE POLICY "Users can read own goals"
  ON daily_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON daily_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON daily_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for app_settings
CREATE POLICY "Users can read own settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Create default app settings
  INSERT INTO app_settings (user_id)
  VALUES (NEW.id);
  
  -- Create default daily goals
  INSERT INTO daily_goals (user_id, goal_type, target_value, goal_date)
  VALUES 
    (NEW.id, 'words', 10, CURRENT_DATE),
    (NEW.id, 'time', 30, CURRENT_DATE),
    (NEW.id, 'accuracy', 80, CURRENT_DATE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats(
  p_user_id uuid,
  p_words_learned integer,
  p_practice_time integer,
  p_accuracy numeric
)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    total_words_learned = total_words_learned + p_words_learned,
    total_practice_time = total_practice_time + p_practice_time,
    accuracy_rate = (accuracy_rate + p_accuracy) / 2,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update word progress
CREATE OR REPLACE FUNCTION update_word_progress(
  p_user_id uuid,
  p_word text,
  p_difficulty text,
  p_correct boolean
)
RETURNS void AS $$
BEGIN
  INSERT INTO word_progress (user_id, word, difficulty, times_practiced, times_correct, last_practiced, updated_at)
  VALUES (p_user_id, p_word, p_difficulty, 1, CASE WHEN p_correct THEN 1 ELSE 0 END, now(), now())
  ON CONFLICT (user_id, word)
  DO UPDATE SET
    times_practiced = word_progress.times_practiced + 1,
    times_correct = word_progress.times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END,
    last_practiced = now(),
    updated_at = now(),
    mastery_level = CASE 
      WHEN (word_progress.times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END)::float / 
           (word_progress.times_practiced + 1) >= 0.9 AND 
           (word_progress.times_practiced + 1) >= 5 THEN 100
      WHEN (word_progress.times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END)::float / 
           (word_progress.times_practiced + 1) >= 0.7 AND 
           (word_progress.times_practiced + 1) >= 3 THEN 75
      WHEN (word_progress.times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END)::float / 
           (word_progress.times_practiced + 1) >= 0.5 THEN 50
      ELSE 25
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_created_at ON learning_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_word_progress_user_id ON word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_word ON word_progress(word);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_id ON daily_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(goal_date);