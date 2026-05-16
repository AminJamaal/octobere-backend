-- Octobere Seed Data

-- Default website sections
INSERT INTO website_sections (slug, display_name, order_index) VALUES
('hero', 'Hero Section', 1),
('services', 'Services', 2),
('about', 'About Us', 3),
('testimonials', 'Testimonials', 4),
('contact', 'Contact', 5),
('footer', 'Footer', 6)
ON CONFLICT (slug) DO NOTHING;

-- Default live page content
INSERT INTO live_page_content (page_name, content) VALUES
('home', '{"hero_title": "Beyond Expectations", "hero_subtitle": "Curating extraordinary experiences for the discerning few"}'),
('services', '{"title": "Our Services", "description": "Tailored luxury experiences"}'),
('whatwedo', '{"title": "What We Do", "description": "Crafting unforgettable moments"}')
ON CONFLICT (page_name) DO NOTHING;

-- Sample directory entries for AI concierge
INSERT INTO directory (name, location, description) VALUES
('Octobere Concierge Desk', 'Main Office', 'Primary contact point for all concierge services'),
('VIP Lounge', 'Terminal 1', 'Exclusive lounge access for premium members'),
('Private Fleet', 'Various', 'Chauffeur-driven luxury vehicles available 24/7')
ON CONFLICT DO NOTHING;
