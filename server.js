const express = require('express');
const fetch = require('node-fetch');
const app = express();

const TOKEN = '7525106329:AAFY_Qx57KcCIIVH4uL2_d1YUdkHdWJM0Tw';
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

app.get('/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        
        // Primero obtenemos la ruta del archivo
        const fileInfoUrl = `https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`;
        const fileInfo = await fetch(fileInfoUrl).then(res => res.json());

        if (!fileInfo.ok || !fileInfo.result.file_path) {
            console.error('Error al obtener información del archivo:', fileInfo);
            return res.status(404).send('Archivo no encontrado');
        }

        const filePath = fileInfo.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

        // Configurar headers básicos
        res.setHeader('Accept-Ranges', 'bytes');

        // Determinar tipo de contenido
        const contentType = getContentType(filePath);
        res.setHeader('Content-Type', contentType);

        // Manejar streaming
        const range = req.headers.range;
        try {
            if (range) {
                const response = await fetch(fileUrl, {
                    headers: { Range: range }
                });

                if (response.ok) {
                    res.status(206);
                    res.setHeader('Content-Range', response.headers.get('content-range'));
                    res.setHeader('Content-Length', response.headers.get('content-length'));
                    response.body.pipe(res);
                } else {
                    throw new Error(`Error en respuesta con range: ${response.status}`);
                }
            } else {
                const response = await fetch(fileUrl);
                if (response.ok) {
                    res.setHeader('Content-Length', response.headers.get('content-length'));
                    response.body.pipe(res);
                } else {
                    throw new Error(`Error en respuesta sin range: ${response.status}`);
                }
            }
        } catch (streamError) {
            console.error('Error en streaming:', streamError);
            if (!res.headersSent) {
                res.status(500).send('Error en streaming');
            }
        }

    } catch (error) {
        console.error('Error general:', error);
        if (!res.headersSent) {
            res.status(500).send('Error interno del servidor');
        }
    }
});

function getContentType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const types = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        mkv: 'video/x-matroska',
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        wav: 'audio/wav',
        ogg: 'audio/ogg'
    };
    return types[ext] || 'application/octet-stream';
}

// Configuración del servidor
const server = app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});

// Configurar timeouts largos
server.timeout = 0; // Sin timeout
server.keepAliveTimeout = 0;
server.headersTimeout = 0;

process.on('uncaughtException', (err) => {
    console.error('Error no capturado:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Promesa rechazada no manejada:', err);
});
