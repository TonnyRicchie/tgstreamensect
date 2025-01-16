const express = require('express');
const fetch = require('node-fetch');
const app = express();

const TOKEN = '7525106329:AAFY_Qx57KcCIIVH4uL2_d1YUdkHdWJM0Tw';
const PORT = process.env.PORT || 3000;

app.get('/ping', (req, res) => {
    res.send('OK');
});

app.get('/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileInfo = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
        const fileData = await fileInfo.json();
        
        if (!fileData.ok) {
            return res.status(404).send('Archivo no encontrado');
        }

        const filePath = fileData.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        
        const range = req.headers.range;
        const fileResponse = await fetch(fileUrl, {
            headers: range ? { Range: range } : {}
        });

        let contentType = 'application/octet-stream';
        if (filePath.endsWith('.mp4')) contentType = 'video/mp4';
        if (filePath.endsWith('.webm')) contentType = 'video/webm';
        if (filePath.endsWith('.mov')) contentType = 'video/quicktime';
        if (filePath.endsWith('.mkv')) contentType = 'video/x-matroska';
        if (filePath.endsWith('.mp3')) contentType = 'audio/mpeg';
        if (filePath.endsWith('.m4a')) contentType = 'audio/mp4';
        if (filePath.endsWith('.wav')) contentType = 'audio/wav';
        if (filePath.endsWith('.ogg')) contentType = 'audio/ogg';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        if (range) {
            res.status(206);
            res.setHeader('Content-Range', fileResponse.headers.get('content-range'));
        } else {
            res.setHeader('Content-Length', fileResponse.headers.get('content-length'));
        }

        fileResponse.body.pipe(res);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error del servidor');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
