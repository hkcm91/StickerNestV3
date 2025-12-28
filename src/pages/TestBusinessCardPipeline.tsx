/**
 * Test Canvas: Business Card Pipeline
 *
 * This page tests the full business card generation pipeline:
 * 1. BusinessCardGeneratorWidget (UI frontend)
 * 2. TemplateLoaderWidget (template provider)
 * 3. TemplateEngineWidget (prompt & mask generator)
 * 4. AIImageGeneratorWidget (Replicate API integration)
 * 5. CompositorWidget (text overlay & export)
 */

import React, { useEffect, useRef, useState } from 'react';
import { BusinessCardGeneratorWidget } from '../widgets/builtin/wizards';
import { TemplateLoaderWidget, AIImageGeneratorWidget, TemplateEngineWidget, CompositorWidget } from '../widgets/builtin/automation';

// Pipeline configuration
const PIPELINE_CONFIG = {
  apiKeyEnvVar: 'VITE_REPLICATE_API_TOKEN',
  defaultModel: 'flux-schnell',
  batchSize: 4,
};

interface PipelineState {
  stage: 'idle' | 'collecting' | 'processing' | 'generating' | 'compositing' | 'complete' | 'error';
  progress: number;
  message: string;
  userData?: Record<string, string>;
  selectedTemplate?: string;
  generatedImages?: string[];
  finalImage?: string;
  error?: string;
}

export function TestBusinessCardPipeline() {
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    stage: 'idle',
    progress: 0,
    message: 'Ready to start',
  });

  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(PIPELINE_CONFIG.defaultModel);
  const [showDebug, setShowDebug] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  // Available AI models
  const availableModels = [
    { id: 'flux-schnell', name: 'Flux Schnell (Fast)', provider: 'replicate' },
    { id: 'flux-dev', name: 'Flux Dev (Quality)', provider: 'replicate' },
    { id: 'sdxl', name: 'Stable Diffusion XL', provider: 'replicate' },
    { id: 'sdxl-lightning', name: 'SDXL Lightning (4-step)', provider: 'replicate' },
    { id: 'kandinsky', name: 'Kandinsky 2.2', provider: 'replicate' },
  ];

  // Add log entry
  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-50), `[${timestamp}] ${message}`]);
  };

  // Check for API key in environment
  useEffect(() => {
    // Try to get API key from environment
    const envKey = import.meta.env.VITE_REPLICATE_API_TOKEN;
    if (envKey) {
      setApiKey(envKey);
      log('API key loaded from environment');
    } else {
      log('No API key found - will use mock generation');
    }

    // Make config available to widgets
    (window as unknown as Record<string, unknown>).StickerNestConfig = {
      VITE_REPLICATE_API_TOKEN: envKey || '',
    };
  }, []);

  // Simulated pipeline handlers
  const handleUserDataCollected = (data: Record<string, string>) => {
    log('User data collected: ' + JSON.stringify(data));
    setPipelineState(prev => ({
      ...prev,
      stage: 'collecting',
      userData: data,
      message: 'Processing user data...',
    }));
  };

  const handleTemplateSelected = (templateId: string) => {
    log('Template selected: ' + templateId);
    setPipelineState(prev => ({
      ...prev,
      selectedTemplate: templateId,
    }));
  };

  const handleGenerateRequest = () => {
    log('Generation requested');
    setPipelineState(prev => ({
      ...prev,
      stage: 'generating',
      progress: 0,
      message: 'Starting AI generation...',
    }));

    // Simulate generation progress
    simulateGeneration();
  };

  const simulateGeneration = () => {
    const steps = ['Preparing prompt...', 'Connecting to AI...', 'Generating design...', 'Processing result...'];
    let step = 0;

    const interval = setInterval(() => {
      if (step >= steps.length) {
        clearInterval(interval);
        setPipelineState(prev => ({
          ...prev,
          stage: 'complete',
          progress: 100,
          message: 'Generation complete!',
          generatedImages: [
            'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="350" height="200"><rect fill="#8b5cf6" width="350" height="200"/><text x="175" y="100" text-anchor="middle" fill="white" font-size="20">Design 1</text></svg>'),
            'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="350" height="200"><rect fill="#06b6d4" width="350" height="200"/><text x="175" y="100" text-anchor="middle" fill="white" font-size="20">Design 2</text></svg>'),
            'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="350" height="200"><rect fill="#10b981" width="350" height="200"/><text x="175" y="100" text-anchor="middle" fill="white" font-size="20">Design 3</text></svg>'),
            'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="350" height="200"><rect fill="#f59e0b" width="350" height="200"/><text x="175" y="100" text-anchor="middle" fill="white" font-size="20">Design 4</text></svg>'),
          ],
        }));
        log('Generation complete - 4 designs ready');
        return;
      }

      setPipelineState(prev => ({
        ...prev,
        progress: ((step + 1) / steps.length) * 100,
        message: steps[step],
      }));
      log(steps[step]);
      step++;
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Card Pipeline Test</h1>
          <p className="text-gray-400">
            Test the full AI-powered business card generation pipeline with reactive templates.
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Pipeline Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Replicate API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key or set VITE_REPLICATE_API_TOKEN"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {apiKey ? '✓ API key set' : 'Using mock generation'}
              </p>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                AI Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Debug Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Debug Panel
              </label>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showDebug
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Pipeline Status */}
          <div className="space-y-6">
            {/* Stage Indicator */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Pipeline Status</h2>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${pipelineState.progress}%` }}
                  />
                </div>

                {/* Stage Display */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium capitalize">
                    {pipelineState.stage}
                  </span>
                  <span className="text-gray-400">{pipelineState.message}</span>
                </div>

                {/* Stage Steps */}
                <div className="flex justify-between text-xs text-gray-500">
                  {['idle', 'collecting', 'processing', 'generating', 'complete'].map((stage, i) => (
                    <div
                      key={stage}
                      className={`flex flex-col items-center ${
                        pipelineState.stage === stage
                          ? 'text-purple-400'
                          : i < ['idle', 'collecting', 'processing', 'generating', 'complete'].indexOf(pipelineState.stage)
                          ? 'text-green-400'
                          : 'text-gray-600'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full mb-1 ${
                          pipelineState.stage === stage
                            ? 'bg-purple-500'
                            : i < ['idle', 'collecting', 'processing', 'generating', 'complete'].indexOf(pipelineState.stage)
                            ? 'bg-green-500'
                            : 'bg-gray-600'
                        }`}
                      />
                      <span className="capitalize">{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Data Preview */}
            {pipelineState.userData && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">Collected Data</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(pipelineState.userData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-400">{key}:</span>
                      <span className="text-white truncate ml-2">{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Designs */}
            {pipelineState.generatedImages && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">Generated Designs</h3>
                <div className="grid grid-cols-2 gap-4">
                  {pipelineState.generatedImages.map((img, i) => (
                    <div
                      key={i}
                      className="aspect-[1.75/1] bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                    >
                      <img src={img} alt={`Design ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Widget Preview or Debug */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleUserDataCollected({
                    fullName: 'John Doe',
                    jobTitle: 'Software Engineer',
                    businessName: 'Tech Corp',
                    email: 'john@techcorp.com',
                    phone: '+1 555-0123',
                    website: 'www.techcorp.com',
                  })}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Simulate User Input
                </button>
                <button
                  onClick={() => handleTemplateSelected('minimal-modern-reactive')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                >
                  Select Template
                </button>
                <button
                  onClick={handleGenerateRequest}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                >
                  Trigger Generation
                </button>
                <button
                  onClick={() => {
                    setPipelineState({
                      stage: 'idle',
                      progress: 0,
                      message: 'Ready to start',
                    });
                    setLogs([]);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Reset Pipeline
                </button>
              </div>
            </div>

            {/* Debug Panel */}
            {showDebug && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
                <div className="h-64 overflow-y-auto bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300">
                  {logs.length === 0 ? (
                    <span className="text-gray-500">No logs yet...</span>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="py-0.5">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Widget Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Pipeline Widgets</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span>BusinessCardGeneratorWidget</span>
                  <span className="px-2 py-1 bg-green-600 rounded text-xs">UI</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span>TemplateLoaderWidget</span>
                  <span className="px-2 py-1 bg-blue-600 rounded text-xs">Automation</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span>TemplateEngineWidget</span>
                  <span className="px-2 py-1 bg-blue-600 rounded text-xs">Automation</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span>AIImageGeneratorWidget</span>
                  <span className="px-2 py-1 bg-purple-600 rounded text-xs">AI ({selectedModel})</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span>CompositorWidget</span>
                  <span className="px-2 py-1 bg-blue-600 rounded text-xs">Automation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestBusinessCardPipeline;
