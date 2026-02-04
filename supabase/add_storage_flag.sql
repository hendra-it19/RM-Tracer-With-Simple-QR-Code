-- Add is_storage column to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS is_storage BOOLEAN DEFAULT FALSE;

-- Update existing records if needed (optional default)
-- UPDATE public.locations SET is_storage = FALSE WHERE is_storage IS NULL;

-- Comment
COMMENT ON COLUMN public.locations.is_storage IS 'Flag to identify if this location is a storage room (e.g. Rekam Medis)';
