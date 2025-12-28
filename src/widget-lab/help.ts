/**
 * Widget Lab Help Text
 * Clear explanations for both technical and non-technical users
 */

// Main intro text shown at the top of the lab
export const INTRO = {
  title: 'Widget Lab',
  subtitle: 'Build interactive widgets and connect them together',
  description: `Widgets are small, reusable components that can send and receive data from each other.
Connect them into pipelines to create powerful, automated workflows.`,
};

// The 3 main workflows explained simply
export const WORKFLOWS = [
  {
    id: 'test',
    icon: '1',
    title: 'Try a Test Widget',
    description: 'Start here! Add a pre-made widget to see how they work.',
    forWho: 'Best for: Getting started',
  },
  {
    id: 'describe',
    icon: '2',
    title: 'Describe What You Need',
    description: 'Tell the AI what you want and it builds widgets for you.',
    forWho: 'Best for: Custom widgets',
  },
  {
    id: 'connect',
    icon: '3',
    title: 'Connect Widgets Together',
    description: 'Select widgets and create pipelines that pass data between them.',
    forWho: 'Best for: Automation',
  },
];

// Section-specific help text
export const SECTIONS = {
  quickTest: {
    title: 'Quick Test',
    subtitle: 'One-click widgets to get started',
    help: 'Click any button to instantly add a working widget to your canvas. Great for learning how widgets communicate.',
    learnMore: 'These widgets are pre-validated and ready to use. Try adding a Button and a Display to see them communicate!',
  },

  workflowBuilder: {
    title: 'AI Workflow Builder',
    subtitle: 'Describe a workflow, AI assembles the widgets',
    help: 'Describe what you want to accomplish in plain English. The AI will figure out which widgets you need and how to connect them.',
    learnMore: 'Example: "A color picker that changes the background of a display widget" - the AI will create both widgets and connect them.',
    placeholder: 'e.g., "A timer that shows a progress bar and plays a sound when done"',
  },

  widgetLibrary: {
    title: 'Your Widget Library',
    subtitle: 'Widgets you\'ve created or added',
    help: 'This shows all available widgets. Quality score indicates how well-connected and reliable each widget is.',
    learnMore: 'Categories help organize widgets by function. Click "Browse" to see details and manage your library.',
  },

  pipelineBuilder: {
    title: 'Pipeline Builder',
    subtitle: 'Connect existing widgets together',
    help: 'Select 2 or more widgets, then let AI suggest how to connect them. Or describe what you want the pipeline to do.',
    learnMore: 'Pipelines define how data flows between widgets. When Widget A outputs data, it can automatically send that data to Widget B\'s input.',
    placeholder: 'e.g., "Connect the color picker output to the shape fill input"',
  },
};

// Key concepts explained for non-technical users
export const CONCEPTS = {
  widget: {
    term: 'Widget',
    simple: 'A small, interactive component (like a button, timer, or color picker)',
    technical: 'An isolated component running in an iframe sandbox with defined inputs/outputs',
  },
  pipeline: {
    term: 'Pipeline',
    simple: 'A connection between widgets that lets them share data automatically',
    technical: 'A configuration defining event routing between widget instances via the EventBus',
  },
  input: {
    term: 'Input',
    simple: 'Data a widget can receive (like "set this color" or "start the timer")',
    technical: 'An event type the widget subscribes to and handles',
  },
  output: {
    term: 'Output',
    simple: 'Data a widget sends out (like "button was clicked" or "color changed to blue")',
    technical: 'An event type the widget emits when its state changes',
  },
  port: {
    term: 'Port',
    simple: 'A named connection point on a widget (inputs and outputs are types of ports)',
    technical: 'A typed endpoint for widget communication defined in the manifest',
  },
};

// Tooltips for specific UI elements
export const TOOLTIPS = {
  aiSelect: 'Let AI analyze your goal and automatically select the right widgets',
  createPipeline: 'Save this combination of widgets as a reusable pipeline',
  quality: 'Quality score based on: proper inputs/outputs, documentation, and error handling',
  inCount: 'Number of input ports - data this widget can receive',
  outCount: 'Number of output ports - data this widget can send',
  expandCategory: 'Click to show/hide widgets in this category',
};

// Example prompts organized by use case
export const EXAMPLE_PROMPTS = {
  simple: [
    'A button that counts how many times it was clicked',
    'A timer that counts down from 60 seconds',
    'A color picker with RGB sliders',
  ],
  intermediate: [
    'A button that triggers a progress bar to fill up',
    'A color picker that sends colors to a receiver widget',
    'A timer that displays countdown in a text widget',
  ],
  advanced: [
    'A dashboard with multiple stats that update in real-time',
    'A form that validates input and shows errors',
    'A kanban board with drag-and-drop cards',
  ],
};

// Error messages with helpful suggestions
export const ERRORS = {
  noDescription: {
    message: 'Please describe what you want to create',
    suggestion: 'Try something like: "A button that shows a message when clicked"',
  },
  selectTwoWidgets: {
    message: 'Select at least 2 widgets to create a pipeline',
    suggestion: 'Click the checkboxes next to widgets you want to connect',
  },
  aiParseFailed: {
    message: 'Could not understand the AI response',
    suggestion: 'Try rephrasing your request or being more specific',
  },
  generationFailed: {
    message: 'Widget generation failed',
    suggestion: 'Try a simpler description or check your API key settings',
  },
};
