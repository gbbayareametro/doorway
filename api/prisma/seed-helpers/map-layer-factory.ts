import { Prisma } from '@prisma/client';
import { randomName } from './word-generator';

export const mapLayerFactory = (
  jurisdictionId: string,
  name?: string,
  data?: Prisma.InputJsonValue,
): Prisma.MapLayersCreateInput => {
  return {
    name: name || randomName(),
    jurisdictionId: jurisdictionId,
    featureCollection: data || redlinedMap,
  };
};

export const simplifiedDCMap = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [
              [-77.0392589333301, 38.79186072967565],
              [-76.90981025809415, 38.89293952026222],
              [-77.04122027689426, 38.996161202682146],
              [-77.12000091005532, 38.93465307055658],
              [-77.10561772391833, 38.91990351952725],
              [-77.09123453778136, 38.90565966392609],
              [-77.06802530560486, 38.9015894658674],
              [-77.06181438431805, 38.889377471720564],
              [-77.03697069917165, 38.870801038935525],
              [-77.03043288729134, 38.850437727576235],
              [-77.03435557441966, 38.80816525459605],
              [-77.0392589333301, 38.79186072967565],
            ],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const redlinedMap = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-122.26591, 37.89001],
              [-122.26565, 37.88796],
              [-122.26533, 37.88531],
              [-122.26311, 37.88555],
              [-122.26276, 37.88617],
              [-122.2626, 37.88673],
              [-122.2626, 37.88705],
              [-122.26255, 37.88735],
              [-122.26236, 37.8875],
              [-122.26211, 37.88761],
              [-122.26177, 37.88773],
              [-122.26153, 37.88782],
              [-122.26144, 37.88802],
              [-122.26145, 37.88821],
              [-122.2616, 37.88848],
              [-122.26208, 37.88886],
              [-122.2623, 37.8891],
              [-122.26241, 37.88967],
              [-122.26188, 37.88994],
              [-122.2609, 37.89018],
              [-122.26052, 37.89016],
              [-122.2602, 37.89014],
              [-122.25989, 37.89016],
              [-122.25931, 37.89032],
              [-122.25876, 37.89063],
              [-122.25887, 37.89067],
              [-122.25919, 37.89067],
              [-122.25943, 37.8907],
              [-122.25976, 37.89081],
              [-122.25983, 37.89091],
              [-122.25991, 37.89104],
              [-122.25969, 37.8914],
              [-122.25976, 37.89166],
              [-122.26018, 37.89202],
              [-122.26051, 37.89218],
              [-122.26087, 37.89218],
              [-122.26223, 37.89188],
              [-122.26268, 37.8917],
              [-122.26314, 37.89137],
              [-122.26353, 37.89106],
              [-122.26407, 37.89062],
              [-122.2649, 37.89022],
              [-122.26535, 37.89002],
              [-122.26591, 37.89001],
            ],
          ],
        ],
      },
      properties: {
        area_id: 6664,
        city_id: 17,
        grade: 'D',
        fill: '#d9838d',
        label: 'D1',
        name: ' ',
        category_id: 4,
        sheets: 1,
        area: 0.0000230966496717784,
        bounds: [
          [37.88531, -122.26591],
          [37.89218, -122.25876],
        ],
        label_coords: [37.888, -122.264],
        residential: true,
        commercial: false,
        industrial: false,
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-122.27239, 37.86322],
              [-122.27236, 37.86524],
              [-122.27271, 37.8653],
              [-122.27275, 37.86581],
              [-122.27328, 37.86584],
              [-122.27332, 37.86662],
              [-122.27303, 37.86696],
              [-122.27253, 37.86696],
              [-122.27268, 37.86879],
              [-122.27371, 37.86876],
              [-122.27392, 37.87025],
              [-122.27296, 37.87062],
              [-122.27303, 37.87119],
              [-122.29152, 37.86896],
              [-122.29132, 37.86812],
              [-122.28897, 37.86111],
              [-122.27239, 37.86322],
            ],
            [
              [-122.28572, 37.86679],
              [-122.28455, 37.86695],
              [-122.28449, 37.86636],
              [-122.2857, 37.86622],
              [-122.28572, 37.86679],
            ],
          ],
          [
            [
              [-122.2732, 37.87251],
              [-122.27479, 37.87235],
              [-122.27526, 37.8765],
              [-122.28269, 37.87569],
              [-122.28235, 37.87301],
              [-122.29281, 37.87163],
              [-122.29201, 37.86973],
              [-122.27314, 37.87202],
              [-122.2732, 37.87251],
            ],
          ],
        ],
      },
      properties: {
        area_id: 6774,
        city_id: 17,
        grade: 'D',
        fill: '#d9838d',
        label: 'D2',
        name: ' ',
        category_id: 4,
        sheets: 1,
        area: 0.000197049068477924,
        bounds: [
          [37.86111, -122.29281],
          [37.8765, -122.27236],
        ],
        label_coords: [37.866, -122.279],
        residential: true,
        commercial: false,
        industrial: false,
      },
      id: 10,
    },
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-122.28911, 37.84974],
              [-122.28665, 37.85025],
              [-122.28947, 37.85919],
              [-122.28987, 37.86059],
              [-122.29112, 37.86446],
              [-122.29249, 37.86893],
              [-122.29947, 37.86731],
              [-122.30288, 37.86649],
              [-122.30249, 37.86552],
              [-122.3012, 37.86364],
              [-122.30055, 37.86264],
              [-122.30056, 37.86192],
              [-122.30041, 37.86166],
              [-122.29993, 37.86082],
              [-122.29948, 37.85998],
              [-122.29893, 37.85862],
              [-122.29834, 37.85694],
              [-122.2977, 37.85497],
              [-122.29654, 37.85182],
              [-122.29601, 37.85002],
              [-122.29601, 37.8496],
              [-122.29559, 37.84842],
              [-122.28911, 37.84974],
            ],
          ],
          [
            [
              [-122.29704, 37.88312],
              [-122.29804, 37.88301],
              [-122.29894, 37.88281],
              [-122.29949, 37.88271],
              [-122.30042, 37.88277],
              [-122.30115, 37.88271],
              [-122.30215, 37.88249],
              [-122.30306, 37.88239],
              [-122.30348, 37.8822],
              [-122.3055, 37.88209],
              [-122.30612, 37.882],
              [-122.30691, 37.88181],
              [-122.30741, 37.88175],
              [-122.30783, 37.88187],
              [-122.30812, 37.88211],
              [-122.30831, 37.8822],
              [-122.30959, 37.88196],
              [-122.30698, 37.87299],
              [-122.30479, 37.86635],
              [-122.30298, 37.86678],
              [-122.30306, 37.86731],
              [-122.30244, 37.86759],
              [-122.29284, 37.86967],
              [-122.29704, 37.88312],
            ],
            [
              [-122.29787, 37.8724],
              [-122.29692, 37.87264],
              [-122.29651, 37.87144],
              [-122.29752, 37.87126],
              [-122.29787, 37.8724],
            ],
          ],
        ],
      },
      properties: {
        area_id: 6672,
        city_id: 17,
        grade: 'D',
        fill: '#d9838d',
        label: 'D3',
        name: ' ',
        category_id: 4,
        sheets: 1,
        area: 0.000366050178227747,
        bounds: [
          [37.84842, -122.30959],
          [37.88312, -122.28665],
        ],
        label_coords: [37.863, -122.296],
        residential: true,
        commercial: false,
        industrial: false,
      },
      id: 12,
    },
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-122.27165, 37.85605],
              [-122.2719, 37.85796],
              [-122.27262, 37.85796],
              [-122.27276, 37.85959],
              [-122.27201, 37.85973],
              [-122.27215, 37.86142],
              [-122.26838, 37.86198],
              [-122.26869, 37.8637],
              [-122.27239, 37.86322],
              [-122.28897, 37.86111],
              [-122.28559, 37.85014],
              [-122.28381, 37.8505],
              [-122.28313, 37.84867],
              [-122.28271, 37.84876],
              [-122.28185, 37.84681],
              [-122.27675, 37.84746],
              [-122.27625, 37.84566],
              [-122.27314, 37.846],
              [-122.27265, 37.84605],
              [-122.27232, 37.84679],
              [-122.27511, 37.84639],
              [-122.27545, 37.8482],
              [-122.27146, 37.84869],
              [-122.27037, 37.85112],
              [-122.2708, 37.85382],
              [-122.27169, 37.85388],
              [-122.27212, 37.85582],
              [-122.27165, 37.85605],
            ],
            [
              [-122.28512, 37.85717],
              [-122.28352, 37.85733],
              [-122.283, 37.85442],
              [-122.28464, 37.85417],
              [-122.28512, 37.85717],
            ],
          ],
          [
            [
              [-122.26623, 37.8623],
              [-122.26474, 37.86252],
              [-122.26498, 37.86432],
              [-122.26545, 37.86711],
              [-122.26688, 37.86696],
              [-122.26623, 37.8623],
            ],
          ],
        ],
      },
      properties: {
        area_id: 6675,
        city_id: 17,
        grade: 'D',
        fill: '#d9838d',
        label: 'D4',
        name: ' ',
        category_id: 4,
        sheets: 1,
        area: 0.000231566437344764,
        bounds: [
          [37.84566, -122.28897],
          [37.86711, -122.26474],
        ],
        label_coords: [37.853, -122.277],
        residential: true,
        commercial: false,
        industrial: false,
      },
      id: 13,
    },
  ],
};
