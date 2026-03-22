export interface AiNewsSource {
  id: string;
  name: string;
  url: string;
}

export const aiNewsSources: AiNewsSource[] = [
  {
    id: 'standard',
    name: 'The Standard Newspaper',
    url: 'https://standard.gm',
  },
  {
    id: 'thepoint',
    name: 'The Point',
    url: 'https://thepoint.gm',
  },
  {
    id: 'foroyaa',
    name: 'Foroyaa Newspaper',
    url: 'https://foroyaa.net',
  },
  {
    id: 'fatunetwork',
    name: 'The Fatu Network',
    url: 'https://fatunetwork.net',
  },
  {
    id: 'voicegambia',
    name: 'The Voice',
    url: 'https://www.voicegambia.com',
  },
  {
    id: 'therepublic',
    name: 'The Republic',
    url: 'https://therepublic.gm',
  },
];
