# Vídeo da página inicial

| Ficheiro | Uso |
|---|---|
| `ddress-colecao.mp4` | Vídeo de fundo do slideshow (vertical, 540×960, 24 fps, sem som, ~9 MB) |
| `ddress-colecao.jpg` | Primeiro fotograma: aparece enquanto o vídeo carrega e em poupança de dados |

Origem: vídeo da colecção enviado pela DDRESS (Google Drive, `.mov` de 127 MB, 720×1280),
convertido para a web com:

```bash
ffmpeg -i original.mov -an -c:v libx264 -preset slow -crf 29 -maxrate 750k -bufsize 1500k \
  -profile:v high -pix_fmt yuv420p -vf "scale=540:960:flags=lanczos" -r 24 -movflags +faststart ddress-colecao.mp4
ffmpeg -ss 16 -i original.mov -frames:v 1 -vf "scale=540:960" -q:v 5 ddress-colecao.jpg
```

Para trocar: substituir os dois ficheiros (ou acrescentar outros e actualizar
`VIDEO_INICIO` em `src/conteudo/slides-inicio.ts`). Os textos dos slides estão no mesmo ficheiro.
