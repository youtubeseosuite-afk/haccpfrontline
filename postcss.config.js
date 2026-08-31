// File Path: /postcss.config.js
// Status: NEW FILE
// Description: PostCSS config — required for Tailwind's @tailwind directives
//              in globals.css to actually compile during the Next.js build.

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
