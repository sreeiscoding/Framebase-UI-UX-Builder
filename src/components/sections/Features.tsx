import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLayerGroup,
  faMobileScreen,
  faRocket,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { features } from "@/lib/constants";

const delays = [
  "reveal-delay-0",
  "reveal-delay-100",
  "reveal-delay-200",
  "reveal-delay-300",
];

const icons = [
  faMobileScreen,
  faWandMagicSparkles,
  faLayerGroup,
  faRocket,
];

export default function Features() {
  return (
    <section className="section bg-gray-50 dark:bg-gray-900 pt-36 sm:pt-28 lg:pt-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title reveal reveal-delay-0" data-reveal>
            Feature highlights
          </h2>
          <p className="section-subtitle reveal reveal-delay-100" data-reveal>
            Everything you need to generate, refine, and ship product-ready UI.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`card card-soft p-6 reveal ${delays[index] ?? "reveal-delay-0"}`}
              data-reveal
            >
              <FontAwesomeIcon
                icon={icons[index] ?? faLayerGroup}
                className="mb-4 text-xl text-indigo-600/90 dark:text-indigo-400"
              />
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
