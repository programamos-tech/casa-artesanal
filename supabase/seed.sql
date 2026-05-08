-- ============================================
-- DATOS DE PRUEBA PARA CASA ARTESANAL (LOCAL)
-- ============================================
-- Mantiene estructura base pero evita cargar datos/productos heredados.
-- ============================================

-- 1) Rol base para administrar localmente
INSERT INTO roles (name, description, permissions, is_system) VALUES
('superadmin', 'Super Administrador local', '["all"]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- 2) Usuario admin local neutro
-- Password: admin123 (solo desarrollo local)
INSERT INTO users (name, email, password, role, permissions, is_active) VALUES
('Admin Casa Artesanal', 'tech@programamos.com', 'admin123', 'superadmin', '["all"]'::jsonb, true)
ON CONFLICT (email) DO NOTHING;

-- 3) Confirmacion
SELECT 'Seed local de Casa Artesanal aplicado' as message,
       (SELECT COUNT(*) FROM users) as usuarios_creados;
