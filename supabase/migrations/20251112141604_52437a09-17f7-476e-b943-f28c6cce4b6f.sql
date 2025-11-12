-- Add media support to messages table
ALTER TABLE public.messages
ADD COLUMN media_url text,
ADD COLUMN media_type text;

-- Create index for better performance when filtering by media
CREATE INDEX idx_messages_media ON public.messages(conversation_id) WHERE media_url IS NOT NULL;