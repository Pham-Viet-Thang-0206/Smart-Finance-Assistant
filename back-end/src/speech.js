import speech from '@google-cloud/speech';

const client = new speech.SpeechClient();

export const transcribeAudio = async ({
  audioBase64,
  mimeType = 'audio/m4a',
  languageCode = 'vi-VN',
}) => {
  if (!audioBase64) return '';

  const request = {
    audio: { content: audioBase64 },
    config: {
      encoding: 'ENCODING_UNSPECIFIED',
      sampleRateHertz: 0,
      languageCode,
      enableAutomaticPunctuation: true,
      audioChannelCount: 1,
      model: 'default',
    },
  };

  // Let the API infer encoding when possible.
  if (mimeType?.includes('wav')) {
    request.config.encoding = 'LINEAR16';
  }

  const [response] = await client.recognize(request);
  const transcript = response.results
    ?.map((result) => result.alternatives?.[0]?.transcript)
    .filter(Boolean)
    .join(' ');

  return transcript || '';
};
