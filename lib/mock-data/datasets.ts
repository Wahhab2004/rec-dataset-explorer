import type { DatasetImage } from "@/lib/dataset-filtering";
import { datasetImages } from "@/lib/mock-data/dataset-images";

export type MockDataset = Readonly<{
  id: string;
  name: string;
  imageCount: number;
  annotationFormat: string;
  updatedAt: string;
  images: readonly DatasetImage[];
}>;

type DerivedImageDefinition = Readonly<{
  sourceImageIndex: number;
  image: Readonly<Omit<DatasetImage, "annotations">>;
}>;

function deriveDatasetImages(
  definitions: readonly DerivedImageDefinition[],
): readonly DatasetImage[] {
  return definitions.map(({ sourceImageIndex, image }) => ({
    ...image,
    tags: [...image.tags],
    annotations: datasetImages[sourceImageIndex].annotations.map(
      (annotation) => ({ ...annotation }),
    ),
  }));
}

const recFrontCameraImages = deriveDatasetImages([
  {
    sourceImageIndex: 0,
    image: {
      id: "rec-front-20260907-0001",
      filename: "rec_front_20260907_073012_0001.jpg",
      timeOfDay: "Daytime",
      weather: "Sunny",
      installationLocation: "Front",
      location: "Taipei - Neihu Test Route",
      tags: ["rec-fleet", "arterial-road", "morning-run"],
    },
  },
  {
    sourceImageIndex: 1,
    image: {
      id: "rec-front-20260907-0002",
      filename: "rec_front_20260907_221845_0002.jpg",
      timeOfDay: "Nighttime",
      weather: "Rainy",
      installationLocation: "Front",
      location: "New Taipei - Banqiao Test Route",
      tags: ["rec-fleet", "wet-road", "night-run"],
    },
  },
  {
    sourceImageIndex: 3,
    image: {
      id: "rec-front-20260907-0003",
      filename: "rec_front_20260907_145433_0003.jpg",
      timeOfDay: "Daytime",
      weather: "Cloudy",
      installationLocation: "Front",
      location: "Taoyuan - Logistics Test Route",
      tags: ["rec-fleet", "industrial", "heavy-vehicle"],
    },
  },
  {
    sourceImageIndex: 5,
    image: {
      id: "rec-front-20260907-0004",
      filename: "rec_front_20260907_193106_0004.jpg",
      timeOfDay: "Nighttime",
      weather: "Foggy",
      installationLocation: "Front",
      location: "Keelung - Harbor Test Route",
      tags: ["rec-fleet", "low-visibility", "freight-route"],
    },
  },
  {
    sourceImageIndex: 6,
    image: {
      id: "rec-front-20260907-0005",
      filename: "rec_front_20260907_110824_0005.jpg",
      timeOfDay: "Daytime",
      weather: "Other",
      installationLocation: "Front",
      location: "Tainan - Roadworks Test Route",
      tags: ["rec-fleet", "construction", "validation-run"],
    },
  },
  {
    sourceImageIndex: 8,
    image: {
      id: "rec-front-20260907-0006",
      filename: "rec_front_20260907_204517_0006.jpg",
      timeOfDay: "Nighttime",
      weather: "Sunny",
      installationLocation: "Front",
      location: "New Taipei - School Zone Test Route",
      tags: ["rec-fleet", "pedestrian", "night-run"],
    },
  },
] as const satisfies readonly DerivedImageDefinition[]);

const cityscapesSubsetImages = deriveDatasetImages([
  {
    sourceImageIndex: 8,
    image: {
      id: "cityscapes-frankfurt-000294",
      filename: "frankfurt_000000_000294_leftImg8bit.png",
      timeOfDay: "Daytime",
      weather: "Cloudy",
      installationLocation: "Front",
      location: "Frankfurt - Innenstadt",
      tags: ["cityscapes", "city-center", "pedestrian"],
    },
  },
  {
    sourceImageIndex: 4,
    image: {
      id: "cityscapes-munster-000019",
      filename: "munster_000045_000019_leftImg8bit.png",
      timeOfDay: "Daytime",
      weather: "Sunny",
      installationLocation: "Front",
      location: "Munster - Hafen",
      tags: ["cityscapes", "cycle-lane", "mixed-traffic"],
    },
  },
  {
    sourceImageIndex: 2,
    image: {
      id: "cityscapes-lindau-000019",
      filename: "lindau_000012_000019_leftImg8bit.png",
      timeOfDay: "Daytime",
      weather: "Sunny",
      installationLocation: "Front",
      location: "Lindau - Insel",
      tags: ["cityscapes", "waterfront", "cycle-lane"],
    },
  },
  {
    sourceImageIndex: 7,
    image: {
      id: "cityscapes-frankfurt-054640",
      filename: "frankfurt_000001_054640_leftImg8bit.png",
      timeOfDay: "Daytime",
      weather: "Cloudy",
      installationLocation: "Front",
      location: "Frankfurt - Sachsenhausen",
      tags: ["cityscapes", "arterial-road", "dense-traffic"],
    },
  },
  {
    sourceImageIndex: 3,
    image: {
      id: "cityscapes-stuttgart-017689",
      filename: "stuttgart_000163_017689_leftImg8bit.png",
      timeOfDay: "Daytime",
      weather: "Foggy",
      installationLocation: "Front",
      location: "Stuttgart - Bad Cannstatt",
      tags: ["cityscapes", "industrial", "low-visibility"],
    },
  },
  {
    sourceImageIndex: 5,
    image: {
      id: "cityscapes-hamburg-000279",
      filename: "hamburg_000000_000279_leftImg8bit.png",
      timeOfDay: "Daytime",
      weather: "Rainy",
      installationLocation: "Front",
      location: "Hamburg - HafenCity",
      tags: ["cityscapes", "wet-road", "freight-route"],
    },
  },
] as const satisfies readonly DerivedImageDefinition[]);

export const mockDatasets = [
  {
    id: "bdd100k-demo",
    name: "BDD100K Demo",
    imageCount: 70_000,
    annotationFormat: "YOLO",
    updatedAt: "2026-09-08",
    images: datasetImages,
  },
  {
    id: "rec-front-camera",
    name: "REC Front Camera Dataset",
    imageCount: 15_320,
    annotationFormat: "YOLO",
    updatedAt: "2026-09-07",
    images: recFrontCameraImages,
  },
  {
    id: "cityscapes-subset",
    name: "Cityscapes Subset",
    imageCount: 5_200,
    annotationFormat: "YOLO",
    updatedAt: "2026-09-05",
    images: cityscapesSubsetImages,
  },
] as const satisfies readonly MockDataset[];

export function getMockDatasetById(id: string): MockDataset | undefined {
  return mockDatasets.find((dataset) => dataset.id === id);
}
