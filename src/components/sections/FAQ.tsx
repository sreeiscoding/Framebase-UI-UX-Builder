import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-regular-svg-icons";
import { faqs } from "@/lib/constants";

const delays = [
  "reveal-delay-0",
  "reveal-delay-100",
  "reveal-delay-200",
  "reveal-delay-300",
];

export default function FAQ() {
  return (
    <section id="faqs" className="section">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title reveal reveal-delay-0" data-reveal>
            Frequently asked questions
          </h2>
          <p className="section-subtitle reveal reveal-delay-100" data-reveal>
            Quick answers to help you move forward with confidence.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:mx-auto md:max-w-4xl">
          {faqs.map((faq, index) => (
            <details
              key={faq.question}
              className={`group card card-soft p-6 reveal ${delays[index] ?? "reveal-delay-0"}`}
              data-reveal
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-left text-base font-semibold">
                <span className="flex items-center">
                  <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="mr-3 text-lg text-indigo-600/80 dark:text-indigo-400"
                  />
                  {faq.question}
                </span>
                <span className="ml-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500 transition group-open:rotate-45 dark:bg-gray-800 dark:text-gray-400">
                  +
                </span>
              </summary>
              <p className="faq-content mt-4 text-sm text-gray-600 dark:text-gray-400">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
