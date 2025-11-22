create database simulador;
use simulador;
drop database simulador;

CREATE TABLE IF NOT EXISTS usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE mensajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remitente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (remitente_id) REFERENCES usuario(id),
    FOREIGN KEY (destinatario_id) REFERENCES usuario(id)
);

CREATE TABLE grupos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    creador_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creador_id) REFERENCES usuario(id)
);

CREATE TABLE grupo_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    UNIQUE KEY unique_grupo_usuario (grupo_id, usuario_id)
);

CREATE TABLE mensajes_grupo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    remitente_id INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leido_por TEXT, -- Almacenará IDs de usuarios que han leído el mensaje
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (remitente_id) REFERENCES usuario(id)
);

truncate table grupos;
Drop table grupo_usuarios;
Drop table mensajes_grupo;

select * from usuario;
select * from mensajes;
select * from grupos;

SHOW CREATE TABLE usuario;
SHOW CREATE TABLE grupos;
SHOW CREATE TABLE mensajes;
SHOW CREATE TABLE mensajes_grupo;
SHOW CREATE TABLE grupo_usuarios;

-- Para mensajes individuales
ALTER TABLE mensajes 
ADD COLUMN tipo_mensaje ENUM('texto', 'ubicacion', 'archivo') DEFAULT 'texto',
ADD COLUMN ubicacion_lat DECIMAL(10, 8) NULL,
ADD COLUMN ubicacion_lng DECIMAL(11, 8) NULL,
ADD COLUMN ubicacion_nombre VARCHAR(255) NULL,
ADD COLUMN archivoNombre VARCHAR(255) NULL,
ADD COLUMN archivoTipo VARCHAR(100) NULL,
ADD COLUMN archivoSize INT NULL,
ADD COLUMN archivoPath VARCHAR(500) NULL,
ADD COLUMN encriptado TINYINT DEFAULT 0;

-- Para mensajes de grupo
ALTER TABLE mensajes_grupo 
ADD COLUMN tipo_mensaje ENUM('texto', 'ubicacion', 'archivo') DEFAULT 'texto',
ADD COLUMN ubicacion_lat DECIMAL(10, 8) NULL,
ADD COLUMN ubicacion_lng DECIMAL(11, 8) NULL,
ADD COLUMN ubicacion_nombre VARCHAR(255) NULL,
ADD COLUMN archivoNombre VARCHAR(255) NULL,
ADD COLUMN archivoTipo VARCHAR(100) NULL,
ADD COLUMN archivoSize INT NULL,
ADD COLUMN archivoPath VARCHAR(500) NULL,
ADD COLUMN encriptado TINYINT DEFAULT 0;

-- Para grupos (índice)
ALTER TABLE grupos ADD KEY `creador_id` (`creador_id`);

-- Para grupo_usuarios (índice)
ALTER TABLE grupo_usuarios ADD KEY `usuario_id` (`usuario_id`);