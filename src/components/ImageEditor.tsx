import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RotateCw, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedImage: Blob) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation: number,
  filters: FilterValues
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // Apply filters
  ctx.filter = `
    brightness(${filters.brightness}%)
    contrast(${filters.contrast}%)
    saturate(${filters.saturation}%)
    grayscale(${filters.grayscale}%)
    sepia(${filters.sepia}%)
  `;

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, "image/jpeg", 1.0);
  });
}

interface FilterValues {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
}

export const ImageEditor = ({ imageSrc, onSave, onCancel }: ImageEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [filters, setFilters] = useState<FilterValues>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
  });

  const onCropComplete = useCallback((_: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        filters
      );
      onSave(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="relative h-[400px] bg-background rounded-lg overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={16 / 9}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: {
              filter: `
                brightness(${filters.brightness}%)
                contrast(${filters.contrast}%)
                saturate(${filters.saturation}%)
                grayscale(${filters.grayscale}%)
                sepia(${filters.sepia}%)
              `,
            },
          }}
        />
      </div>

      <Tabs defaultValue="crop" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="crop">Crop</TabsTrigger>
          <TabsTrigger value="rotate">Rotate</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="crop" className="space-y-4">
          <div className="space-y-2">
            <Label>Zoom</Label>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
            />
          </div>
        </TabsContent>

        <TabsContent value="rotate" className="space-y-4">
          <Button onClick={handleRotate} variant="outline" className="w-full gap-2">
            <RotateCw className="h-4 w-4" />
            Rotate 90°
          </Button>
          <div className="space-y-2">
            <Label>Fine Rotation: {rotation}°</Label>
            <Slider
              value={[rotation]}
              onValueChange={(value) => setRotation(value[0])}
              min={0}
              max={360}
              step={1}
            />
          </div>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <div className="space-y-2">
            <Label>Brightness</Label>
            <Slider
              value={[filters.brightness]}
              onValueChange={(value) =>
                setFilters({ ...filters, brightness: value[0] })
              }
              min={0}
              max={200}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Contrast</Label>
            <Slider
              value={[filters.contrast]}
              onValueChange={(value) =>
                setFilters({ ...filters, contrast: value[0] })
              }
              min={0}
              max={200}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Saturation</Label>
            <Slider
              value={[filters.saturation]}
              onValueChange={(value) =>
                setFilters({ ...filters, saturation: value[0] })
              }
              min={0}
              max={200}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Grayscale</Label>
            <Slider
              value={[filters.grayscale]}
              onValueChange={(value) =>
                setFilters({ ...filters, grayscale: value[0] })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Sepia</Label>
            <Slider
              value={[filters.sepia]}
              onValueChange={(value) =>
                setFilters({ ...filters, sepia: value[0] })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel} variant="outline" className="gap-2">
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-gradient-primary gap-2">
          <Check className="h-4 w-4" />
          Apply & Continue
        </Button>
      </div>
    </Card>
  );
};
