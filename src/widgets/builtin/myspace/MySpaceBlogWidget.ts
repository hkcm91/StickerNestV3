/**
 * StickerNest v2 - MySpace Blog Widget (2006 Theme)
 * ===================================================
 *
 * The classic MySpace blog - where people posted surveys, song lyrics,
 * emotional rants, and "currently listening to" updates. This was
 * social media before Twitter!
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const MySpaceBlogWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-blog',
  name: 'MySpace Blog',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 blog widget.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'blog', 'posts', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    posts: {
      type: 'array',
      description: 'Array of blog post objects',
      default: [],
    },
  },
  outputs: {
    postClicked: { type: 'object', description: 'Blog post clicked to read' },
    newPostClicked: { type: 'object', description: 'New post button clicked' },
    subscribeClicked: { type: 'object', description: 'Subscribe clicked' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['posts.set', 'data.set'],
    outputs: ['post.clicked', 'newpost.clicked', 'subscribe.clicked'],
  },
  size: {
    width: 400,
    height: 380,
    minWidth: 300,
    minHeight: 300,
    scaleMode: 'stretch',
  },
};

export const MySpaceBlogWidgetHTML = `
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
      font-family: Verdana, Arial, Helvetica, sans-serif;
      font-size: 10px;
      background: #B4D0DC;
    }

    .myspace-container {
      width: 100%;
      height: 100%;
      background: #B4D0DC;
      padding: 8px;
    }

    .blog-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .blog-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .blog-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .blog-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .header-link {
      color: #FFCC00;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
    }

    .header-link:hover {
      color: #FFFFFF;
    }

    .blog-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .blog-post {
      border: 1px solid #99CCFF;
      margin-bottom: 10px;
      background: #FFFFFF;
    }

    .post-header {
      background: linear-gradient(180deg, #6699CC 0%, #99CCFF 100%);
      padding: 6px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .post-title {
      color: #003366;
      font-weight: bold;
      font-size: 11px;
      text-decoration: underline;
      cursor: pointer;
    }

    .post-title:hover {
      color: #000000;
    }

    .post-date {
      color: #336699;
      font-size: 9px;
    }

    .post-meta {
      background: #E8F4F8;
      padding: 4px 8px;
      font-size: 9px;
      color: #666666;
      border-bottom: 1px solid #99CCFF;
    }

    .post-meta span {
      margin-right: 12px;
    }

    .post-body {
      padding: 10px;
      font-size: 10px;
      color: #333333;
      line-height: 1.6;
    }

    .post-preview {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .post-footer {
      padding: 6px 8px;
      background: #F8F8F8;
      border-top: 1px solid #EEEEEE;
      display: flex;
      gap: 12px;
    }

    .post-action {
      color: #FF6633;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
    }

    .post-action:hover {
      color: #FF3300;
    }

    .currently-section {
      background: #FFFFCC;
      border: 1px dashed #CCCC00;
      padding: 8px;
      margin-bottom: 10px;
      font-size: 10px;
    }

    .currently-label {
      color: #666600;
      font-weight: bold;
    }

    .currently-value {
      color: #333333;
      font-style: italic;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 14px;
    }

    ::-webkit-scrollbar-track {
      background: #B4D0DC;
    }

    ::-webkit-scrollbar-thumb {
      background: #336699;
      border: 2px solid #B4D0DC;
    }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="blog-box">
      <div class="blog-header">
        <div class="blog-header-left">
          <svg class="blog-header-icon" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span id="headerTitle">Tom's Blog</span>
        </div>
        <div class="header-actions">
          <a class="header-link" id="subscribeLink">[Subscribe]</a>
          <a class="header-link" id="newPostLink">[Post New Blog]</a>
        </div>
      </div>

      <div class="blog-list" id="blogList">
        <!-- Blog posts populated here -->
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        username: 'Tom',
        posts: [],
        currently: {
          listening: 'My Chemical Romance - Welcome to the Black Parade',
          reading: 'The Perks of Being a Wallflower',
          watching: 'The O.C.',
          mood: 'contemplative'
        }
      };

      // Default blog posts
      const defaultPosts = [
        {
          id: 1,
          title: 'Survey Time!! 50 Questions About Me',
          date: '12/24/2006 11:30 PM',
          category: 'Survey',
          views: 42,
          comments: 8,
          kudos: 3,
          body: '1. Full name: Tom Anderson\\n2. Nickname: Tom\\n3. Birthday: November 8\\n4. Place of birth: San Diego\\n5. Current location: Los Angeles\\n...\\n\\nRepost with your answers!!'
        },
        {
          id: 2,
          title: 'why does everything have 2 be so complicated??',
          date: '12/22/2006 2:15 AM',
          category: 'Life',
          views: 156,
          comments: 23,
          kudos: 12,
          body: 'ugh i dont even know where 2 start... today was so weird. like, i thought things were going good but then everything just fell apart. why cant ppl just say what they mean?? im so tired of all the drama...'
        },
        {
          id: 3,
          title: '~*~Song Lyrics That Describe My Life RN~*~',
          date: '12/20/2006 8:45 PM',
          category: 'Music',
          views: 89,
          comments: 15,
          kudos: 7,
          body: '"When I was a young boy, my father took me into the city to see a marching band..."\\n\\nthis song gets me every time. MCR understands. <3'
        }
      ];

      // Elements
      const headerTitle = document.getElementById('headerTitle');
      const blogList = document.getElementById('blogList');
      const subscribeLink = document.getElementById('subscribeLink');
      const newPostLink = document.getElementById('newPostLink');

      // Render blog
      function render() {
        headerTitle.textContent = state.username + "'s Blog";

        blogList.innerHTML = '';

        // Currently section
        if (state.currently) {
          const currentlyDiv = document.createElement('div');
          currentlyDiv.className = 'currently-section';
          let currentlyHTML = '';
          if (state.currently.listening) {
            currentlyHTML += '<div><span class="currently-label">Currently Listening To:</span> <span class="currently-value">' + state.currently.listening + '</span></div>';
          }
          if (state.currently.reading) {
            currentlyHTML += '<div><span class="currently-label">Currently Reading:</span> <span class="currently-value">' + state.currently.reading + '</span></div>';
          }
          if (state.currently.mood) {
            currentlyHTML += '<div><span class="currently-label">Current Mood:</span> <span class="currently-value">' + state.currently.mood + '</span></div>';
          }
          currentlyDiv.innerHTML = currentlyHTML;
          blogList.appendChild(currentlyDiv);
        }

        // Posts
        const posts = state.posts.length > 0 ? state.posts : defaultPosts;

        posts.forEach(function(post) {
          const postEl = document.createElement('div');
          postEl.className = 'blog-post';
          postEl.innerHTML = \`
            <div class="post-header">
              <span class="post-title" data-post-id="\${post.id}">\${post.title}</span>
              <span class="post-date">\${post.date}</span>
            </div>
            <div class="post-meta">
              <span>Category: \${post.category || 'General'}</span>
              <span>Views: \${post.views || 0}</span>
              <span>Comments: \${post.comments || 0}</span>
            </div>
            <div class="post-body">
              <div class="post-preview">\${post.body.replace(/\\n/g, '<br>')}</div>
            </div>
            <div class="post-footer">
              <a class="post-action read-more" data-post-id="\${post.id}">Read Full Blog</a>
              <a class="post-action">Add Comment</a>
              <a class="post-action">Give Kudos (\${post.kudos || 0})</a>
            </div>
          \`;
          blogList.appendChild(postEl);
        });

        // Add click handlers
        blogList.querySelectorAll('.post-title, .read-more').forEach(function(el) {
          el.addEventListener('click', function() {
            const postId = this.dataset.postId;
            const post = posts.find(p => p.id == postId);
            if (post) {
              API.emitOutput('post.clicked', {
                id: post.id,
                title: post.title
              });
            }
          });
        });
      }

      // Event handlers
      subscribeLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('subscribe.clicked', { username: state.username });
      });

      newPostLink.addEventListener('click', function(e) {
        e.preventDefault();
        API.emitOutput('newpost.clicked', {});
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceBlogWidget mounted');
      });

      // Handle posts.set input
      API.onInput('posts.set', function(posts) {
        if (Array.isArray(posts)) {
          state.posts = posts;
          render();
          API.setState({ posts: state.posts });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.username = data.username || state.username;
          state.posts = data.posts || state.posts;
          state.currently = data.currently || state.currently;
        }
        render();
        API.setState(state);
      });

      API.onDestroy(function() {
        API.log('MySpaceBlogWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceBlogWidget: BuiltinWidget = {
  manifest: MySpaceBlogWidgetManifest,
  html: MySpaceBlogWidgetHTML,
};
