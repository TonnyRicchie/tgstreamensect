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

app.get('/ping', (req, res) => {
    res.send('OK');
});

app.get('/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        console.log(`Procesando solicitud para fileId: ${fileId}`);

        // Obtener URL directa de Telegram
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileId}`;

        // Configurar headers básicos
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        // Determinar tipo de contenido basado en la extensión
        let contentType = 'application/octet-stream';
        if (fileId.includes('.mp4')) contentType = 'video/mp4';
        if (fileId.includes('.webm')) contentType = 'video/webm';
        if (fileId.includes('.mov')) contentType = 'video/quicktime';
        if (fileId.includes('.mkv')) contentType = 'video/x-matroska';
        if (fileId.includes('.mp3')) contentType = 'audio/mpeg';
        if (fileId.includes('.m4a')) contentType = 'audio/mp4';
        if (fileId.includes('.wav')) contentType = 'audio/wav';
        if (fileId.includes('.ogg')) contentType = 'audio/ogg';
        res.setHeader('Content-Type', contentType);

        // Manejar solicitud de rango
        const range = req.headers.range;
        if (range) {
            console.log(`Procesando solicitud con range: ${range}`);
            const response = await fetch(fileUrl, {
                headers: { 'Range': range }
            });

            if (!response.ok) {
                console.error(`Error al obtener archivo de Telegram: ${response.status}`);
                return res.status(response.status).send('Error al obtener archivo');
            }

            res.status(206);
            // Copiar headers relevantes de la respuesta de Telegram
            ['content-range', 'content-length'].forEach(header => {
                const value = response.headers.get(header);
                if (value) res.setHeader(header, value);
            });

            response.body.pipe(res);
        } else {
            console.log('Procesando solicitud sin range');
            const response = await fetch(fileUrl);

            if (!response.ok) {
                console.error(`Error al obtener archivo de Telegram: ${response.status}`);
                return res.status(response.status).send('Error al obtener archivo');
            }

            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                res.setHeader('Content-Length', contentLength);
            }

            response.body.pipe(res);
        }

    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).send('Error interno del servidor');
});

const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Configurar timeouts más largos
server.timeout = 600000; // 10 minutos
server.keepAliveTimeout = 620000;
server.headersTimeout = 621000;

// Manejar errores de conexión
process.on('uncaughtException', (err) => {
    console.error('Excepción no capturada:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Rechazo no manejado en:', promise, 'razón:', reason);
});
