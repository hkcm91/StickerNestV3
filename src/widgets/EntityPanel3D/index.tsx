/**
 * StickerNest - 3D Entity Panel Widget
 *
 * VR/AR panel for adding 3D entities to the spatial scene.
 * Features:
 * - Search Poly Haven for free CC0 3D models
 * - Upload GLTF/GLB/OBJ files
 * - Add images as spatial stickers
 * - Spawn 3D primitives with custom colors
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Upload, Image, Box, Circle, Hexagon, Square, Triangle, Disc,
  X, Loader2, ChevronLeft, ChevronRight, Plus, Check, RefreshCw
} from 'lucide-react';
import {
  searchModelsCached,
  getModelDownloadUrl,
  getModelThumbnailUrl,
  POLY_HAVEN_CATEGORIES,
  type PolyHavenModel,
  type PolyHavenCategory,
} from '../../services/polyHavenApi';

// ============================================================================
// Types
// ============================================================================

type TabType = 'search' | 'upload' | 'images' | 'primitives';
type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'ring';

interface EntityPanel3DProps {
  api?: any;
}

interface UploadedFile {
  id: string;
  name: string;
  type: 'gltf' | 'glb' | 'obj' | 'image';
  url: string;
  thumbnail?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PRIMITIVES: { type: PrimitiveType; icon: React.ReactNode; label: string }[] = [
  { type: 'cube', icon: <Square size={24} />, label: 'Cube' },
  { type: 'sphere', icon: <Circle size={24} />, label: 'Sphere' },
  { type: 'cylinder', icon: <Disc size={24} />, label: 'Cylinder' },
  { type: 'cone', icon: <Triangle size={24} />, label: 'Cone' },
  { type: 'torus', icon: <Hexagon size={24} />, label: 'Torus' },
  { type: 'plane', icon: <Box size={24} />, label: 'Plane' },
  { type: 'ring', icon: <Circle size={24} />, label: 'Ring' },
];

const COLOR_PRESETS = [
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#ffffff', // White
  '#1f2937', // Dark gray
];

// ============================================================================
// Tab Components
// ============================================================================

const SearchTab: React.FC<{
  onAddModel: (model: PolyHavenModel) => void;
  api: any;
}> = ({ onAddModel, api }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PolyHavenCategory>('all');
  const [models, setModels] = useState<PolyHavenModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);

  const searchModels = useCallback(async (resetPage = true) => {
    setLoading(true);
    try {
      const currentPage = resetPage ? 1 : page;
      const result = await searchModelsCached({
        query,
        categories: category === 'all' ? [] : [category],
        page: currentPage,
        limit: 12,
      });
      setModels(resetPage ? result.models : [...models, ...result.models]);
      setHasMore(result.hasMore);
      if (resetPage) setPage(1);
    } catch (error) {
      api.log('Search error: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, category, page, models, api]);

  useEffect(() => {
    searchModels(true);
  }, [category]);

  const handleAddModel = async (model: PolyHavenModel) => {
    setLoadingModel(model.id);
    try {
      const downloadUrl = await getModelDownloadUrl(model.id);
      if (downloadUrl) {
        onAddModel({ ...model, previewUrl: downloadUrl });
      } else {
        api.log('No download URL found for model: ' + model.id);
      }
    } catch (error) {
      api.log('Error getting model URL: ' + (error as Error).message);
    } finally {
      setLoadingModel(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchModels(true)}
            placeholder="Search 3D models..."
            className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg
                       text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          onClick={() => searchModels(true)}
          disabled={loading}
          className="h-10 px-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {POLY_HAVEN_CATEGORIES.slice(0, 8).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors
                       ${category === cat
                         ? 'bg-purple-600 text-white'
                         : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                       }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Results Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading && models.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-purple-500" />
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <Box size={48} />
            <p className="mt-2 text-sm">No models found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {models.map((model) => (
              <div
                key={model.id}
                className="relative group rounded-lg overflow-hidden bg-white/5 aspect-square
                           hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleAddModel(model)}
              >
                <img
                  src={model.thumbnailUrl}
                  alt={model.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent
                                opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-white text-xs truncate">{model.name}</span>
                </div>
                {loadingModel === model.id && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-purple-500" />
                  </div>
                )}
                <button
                  className="absolute top-2 right-2 w-7 h-7 bg-purple-600 rounded-full
                             flex items-center justify-center opacity-0 group-hover:opacity-100
                             hover:bg-purple-500 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddModel(model);
                  }}
                >
                  <Plus size={14} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <button
            onClick={() => {
              setPage(page + 1);
              searchModels(false);
            }}
            className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
};

const UploadTab: React.FC<{
  onAddFile: (file: UploadedFile) => void;
  api: any;
}> = ({ onAddFile, api }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['gltf', 'glb', 'obj', 'png', 'jpg', 'jpeg', 'webp'];

    if (!ext || !validExts.includes(ext)) {
      api.log('Invalid file type: ' + ext);
      return;
    }

    const url = URL.createObjectURL(file);
    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);

    const uploadedFile: UploadedFile = {
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: isImage ? 'image' : (ext as 'gltf' | 'glb' | 'obj'),
      url,
      thumbnail: isImage ? url : undefined,
    };

    setUploadedFiles((prev) => [...prev, uploadedFile]);
    api.log('File uploaded: ' + file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Drop Zone */}
      <div
        className={`flex-shrink-0 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center
                    cursor-pointer transition-colors
                    ${dragActive
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                    }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={32} className={dragActive ? 'text-purple-500' : 'text-white/40'} />
        <p className="mt-2 text-sm text-white/60">
          Drop files here or <span className="text-purple-400">browse</span>
        </p>
        <p className="text-xs text-white/40 mt-1">GLTF, GLB, OBJ, PNG, JPG</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".gltf,.glb,.obj,.png,.jpg,.jpeg,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploaded Files */}
      <div className="flex-1 overflow-y-auto">
        {uploadedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40">
            <Upload size={32} />
            <p className="mt-2 text-sm">No files uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="relative group rounded-lg overflow-hidden bg-white/5 p-3
                           hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => onAddFile(file)}
              >
                <div className="flex items-center gap-2">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.name} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                      <Box size={20} className="text-white/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{file.name}</p>
                    <p className="text-white/40 text-xs uppercase">{file.type}</p>
                  </div>
                </div>
                <button
                  className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full
                             flex items-center justify-center opacity-0 group-hover:opacity-100
                             hover:bg-purple-500 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFile(file);
                  }}
                >
                  <Plus size={12} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ImagesTab: React.FC<{
  onAddImage: (url: string, name: string) => void;
  api: any;
}> = ({ onAddImage, api }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [recentImages, setRecentImages] = useState<{ url: string; name: string }[]>([]);

  const handleAddFromUrl = () => {
    if (!imageUrl.trim()) return;

    const name = imageUrl.split('/').pop()?.split('?')[0] || 'Image';
    onAddImage(imageUrl, name);
    setRecentImages((prev) => [{ url: imageUrl, name }, ...prev.slice(0, 11)]);
    setImageUrl('');
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* URL Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddFromUrl()}
          placeholder="Paste image URL..."
          className="flex-1 h-10 px-4 bg-white/5 border border-white/10 rounded-lg
                     text-white placeholder-white/40 text-sm focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleAddFromUrl}
          disabled={!imageUrl.trim()}
          className="h-10 px-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {/* Info */}
      <div className="bg-white/5 rounded-lg p-3 text-sm text-white/60">
        <p>Images will be added as 2D planes in 3D space. They can be:</p>
        <ul className="mt-2 list-disc list-inside text-xs text-white/40 space-y-1">
          <li>Billboarded (always face camera)</li>
          <li>Fixed orientation in space</li>
          <li>Attached to surfaces</li>
        </ul>
      </div>

      {/* Recent Images */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs text-white/40 mb-2">Recent Images</p>
        {recentImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-white/40">
            <Image size={32} />
            <p className="mt-2 text-sm">No recent images</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {recentImages.map((img, i) => (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden bg-white/5 aspect-square
                           hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => onAddImage(img.url, img.name)}
              >
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                transition-opacity flex items-center justify-center">
                  <Plus size={20} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PrimitivesTab: React.FC<{
  onAddPrimitive: (type: PrimitiveType, color: string) => void;
  api: any;
}> = ({ onAddPrimitive, api }) => {
  const [selectedPrimitive, setSelectedPrimitive] = useState<PrimitiveType>('cube');
  const [selectedColor, setSelectedColor] = useState('#8b5cf6');

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Primitives Grid */}
      <div>
        <p className="text-xs text-white/40 mb-2">Select Shape</p>
        <div className="grid grid-cols-4 gap-2">
          {PRIMITIVES.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => setSelectedPrimitive(type)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1
                         transition-all
                         ${selectedPrimitive === type
                           ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                           : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                         }`}
            >
              {icon}
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <p className="text-xs text-white/40 mb-2">Select Color</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110
                         ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer relative
                           bg-gradient-conic from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 to-purple-500">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-24 h-24 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: selectedColor + '20' }}
        >
          <div
            className="w-16 h-16 rounded-lg shadow-lg flex items-center justify-center"
            style={{ backgroundColor: selectedColor }}
          >
            {PRIMITIVES.find((p) => p.type === selectedPrimitive)?.icon}
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => onAddPrimitive(selectedPrimitive, selectedColor)}
        className="h-12 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-medium
                   flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={18} />
        Add {selectedPrimitive.charAt(0).toUpperCase() + selectedPrimitive.slice(1)}
      </button>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EntityPanel3DWidget: React.FC<EntityPanel3DProps> = ({ api: propApi }) => {
  const API = propApi || (window as any).WidgetAPI || {
    emitOutput: console.log,
    setState: console.log,
    onInput: () => () => {},
    onStateChange: () => () => {},
    onMount: (cb: any) => cb({ state: {} }),
    log: console.log,
  };

  const [activeTab, setActiveTab] = useState<TabType>('primitives');
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    API.onMount((context: any) => {
      if (context.state?.activeTab) {
        setActiveTab(context.state.activeTab);
      }
      API.log('EntityPanel3D mounted');
    });

    API.onInput('tab.set', (tab: TabType) => {
      setActiveTab(tab);
      API.setState({ activeTab: tab });
    });

    return () => {
      API.log('EntityPanel3D unmounted');
    };
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    API.setState({ activeTab: tab });
    API.emitOutput('tab.changed', { tab });
  };

  const handleAddModel = (model: PolyHavenModel) => {
    API.emitOutput('entity.added', {
      type: '3d-model',
      id: `model-${Date.now()}`,
      name: model.name,
      modelUrl: model.previewUrl,
      format: 'glb',
      source: 'poly-haven',
      polyHavenId: model.id,
    });
    setAddedCount((c) => c + 1);
    API.log('Added model: ' + model.name);
  };

  const handleAddFile = (file: UploadedFile) => {
    if (file.type === 'image') {
      API.emitOutput('entity.added', {
        type: 'image',
        id: file.id,
        name: file.name,
        imageSrc: file.url,
        source: 'upload',
      });
    } else {
      API.emitOutput('entity.added', {
        type: '3d-model',
        id: file.id,
        name: file.name,
        modelUrl: file.url,
        format: file.type,
        source: 'upload',
      });
    }
    setAddedCount((c) => c + 1);
    API.log('Added file: ' + file.name);
  };

  const handleAddImage = (url: string, name: string) => {
    API.emitOutput('entity.added', {
      type: 'image',
      id: `image-${Date.now()}`,
      name,
      imageSrc: url,
      source: 'url',
    });
    setAddedCount((c) => c + 1);
    API.log('Added image: ' + name);
  };

  const handleAddPrimitive = (type: PrimitiveType, color: string) => {
    API.emitOutput('entity.added', {
      type: '3d-primitive',
      id: `primitive-${Date.now()}`,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      primitiveType: type,
      color,
      source: 'primitive',
    });
    setAddedCount((c) => c + 1);
    API.log('Added primitive: ' + type);
  };

  const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: 'search', icon: <Search size={16} />, label: 'Search' },
    { id: 'upload', icon: <Upload size={16} />, label: 'Upload' },
    { id: 'images', icon: <Image size={16} />, label: 'Images' },
    { id: 'primitives', icon: <Box size={16} />, label: 'Shapes' },
  ];

  return (
    <div className="w-full h-full bg-[#0f0f19] text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Box size={20} className="text-purple-400" />
          <span className="font-semibold">3D Entity Panel</span>
        </div>
        {addedCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-green-400 text-xs">
            <Check size={12} />
            {addedCount} added
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors
                       ${activeTab === id
                         ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5'
                         : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                       }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden p-4">
        {activeTab === 'search' && <SearchTab onAddModel={handleAddModel} api={API} />}
        {activeTab === 'upload' && <UploadTab onAddFile={handleAddFile} api={API} />}
        {activeTab === 'images' && <ImagesTab onAddImage={handleAddImage} api={API} />}
        {activeTab === 'primitives' && <PrimitivesTab onAddPrimitive={handleAddPrimitive} api={API} />}
      </div>
    </div>
  );
};

export default EntityPanel3DWidget;
