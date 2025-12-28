/**
 * StickerNest v2 - Quote Widget
 *
 * Displays inspirational quotes with a beautiful design.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const QuoteWidgetManifest: WidgetManifest = {
  id: 'stickernest.quote',
  name: 'Quote',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Displays inspirational quotes',
  author: 'StickerNest',
  tags: ['quote', 'inspiration', 'text', 'display', 'core'],
  inputs: {
    quote: {
      type: 'string',
      description: 'The quote text',
      default: 'The only way to do great work is to love what you do.',
    },
    author: {
      type: 'string',
      description: 'Quote author',
      default: 'Steve Jobs',
    },
  },
  outputs: {
    clicked: {
      type: 'trigger',
      description: 'Emitted when quote is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['quote.set', 'quote.next', 'quote.random'],
    outputs: ['quote.clicked', 'quote.changed'],
  },
  size: {
    width: 300,
    height: 150,
    minWidth: 200,
    minHeight: 100,
    scaleMode: 'scale',
  },
};

export const QuoteWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: 'Georgia', serif;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .container:hover {
      transform: scale(1.02);
    }
    .quote-mark {
      font-size: 48px;
      color: rgba(255,255,255,0.3);
      line-height: 1;
      margin-bottom: -20px;
    }
    .quote {
      font-size: 16px;
      font-style: italic;
      color: white;
      text-align: center;
      line-height: 1.5;
      max-width: 100%;
    }
    .author {
      font-size: 12px;
      color: rgba(255,255,255,0.8);
      margin-top: 12px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .author::before {
      content: '— ';
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="quote-mark">"</div>
    <div class="quote" id="quote">The only way to do great work is to love what you do.</div>
    <div class="author" id="author">Steve Jobs</div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const quoteEl = document.getElementById('quote');
      const authorEl = document.getElementById('author');

      const defaultQuotes = [
        { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
        { quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
        { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { quote: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
        { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
        { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
        { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
      ];

      let currentIndex = 0;
      let quote = defaultQuotes[0].quote;
      let author = defaultQuotes[0].author;

      function updateDisplay() {
        quoteEl.textContent = quote;
        authorEl.textContent = author;
        API.emitOutput('quote.changed', { quote, author });
      }

      function nextQuote() {
        currentIndex = (currentIndex + 1) % defaultQuotes.length;
        quote = defaultQuotes[currentIndex].quote;
        author = defaultQuotes[currentIndex].author;
        updateDisplay();
        API.setState({ quote, author, currentIndex });
      }

      function randomQuote() {
        currentIndex = Math.floor(Math.random() * defaultQuotes.length);
        quote = defaultQuotes[currentIndex].quote;
        author = defaultQuotes[currentIndex].author;
        updateDisplay();
        API.setState({ quote, author, currentIndex });
      }

      API.onMount(function(context) {
        const state = context.state || {};
        quote = state.quote || defaultQuotes[0].quote;
        author = state.author || defaultQuotes[0].author;
        currentIndex = state.currentIndex || 0;
        updateDisplay();
        API.log('QuoteWidget mounted');
      });

      container.addEventListener('click', function() {
        nextQuote();
        API.emitOutput('quote.clicked', { quote, author });
      });

      API.onInput('quote.set', function(data) {
        if (typeof data === 'string') {
          quote = data;
        } else if (data) {
          quote = data.quote || quote;
          author = data.author || author;
        }
        updateDisplay();
        API.setState({ quote, author });
      });

      API.onInput('quote.next', nextQuote);
      API.onInput('quote.random', randomQuote);

      API.onStateChange(function(newState) {
        if (newState.quote !== undefined) quote = newState.quote;
        if (newState.author !== undefined) author = newState.author;
        updateDisplay();
      });

      API.onDestroy(function() {
        API.log('QuoteWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const QuoteWidget: BuiltinWidget = {
  manifest: QuoteWidgetManifest,
  html: QuoteWidgetHTML,
};
