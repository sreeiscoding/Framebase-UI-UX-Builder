export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gradient-to-b dark:from-gray-950 dark:to-black">
      <div className="container flex flex-col items-center gap-6 py-12 text-center text-sm text-gray-500 md:flex-row md:items-center md:justify-between md:text-left dark:text-gray-400">
        <div className="font-semibold text-gray-900 dark:text-gray-100">Framebase</div>
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <a href="#pricing" className="transition hover:text-gray-900 dark:hover:text-gray-100">
            Pricing
          </a>
          <a href="#" className="transition hover:text-gray-900 dark:hover:text-gray-100">
            Privacy
          </a>
          <a href="mailto:contact@uibuilder.ai" className="transition hover:text-gray-900 dark:hover:text-gray-100">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
