import { benefits } from "@/lib/constants";

const delays = ["reveal-delay-0", "reveal-delay-200"];

export default function Benefits() {
  return (
    <section className="section">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title reveal reveal-delay-0" data-reveal>
            Built for every product team
          </h2>
          <p className="section-subtitle reveal reveal-delay-100" data-reveal>
            Align founders and designers around a shared, editable UI vision.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {benefits.map((column, index) => (
            <div
              key={column.title}
              className={`card card-soft p-8 reveal ${delays[index] ?? "reveal-delay-0"}`}
              data-reveal
            >
              <h3 className="text-xl font-semibold">{column.title}</h3>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {column.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400 dark:bg-indigo-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
