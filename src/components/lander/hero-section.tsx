import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

// React Icons
import {
  SiReact,
  SiTypescript,
  SiTailwindcss,
  SiNextdotjs,
  SiShadcnui,
  SiCalendly,
} from "react-icons/si";
import Link from "next/link";
import { FaCalendarDay } from "react-icons/fa6";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-32">
      {/* Background pattern */}
      <div className="absolute inset-x-0 top-0 flex h-full w-full items-center justify-center opacity-100">
        <img
          alt="background"
          src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/patterns/square-alt-grid.svg"
          className="[mask-image:radial-gradient(75%_75%_at_center,white,transparent)] opacity-90"
        />
      </div>

      <div className="relative z-10 container">
        <div className="mx-auto flex max-w-5xl flex-col items-center">
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Logo */}
            <div className="rounded-xl bg-background/30 p-4 shadow-sm backdrop-blur-sm">
              <SiCalendly className="h-12 w-12 text-primary" />
            </div>

            {/* Heading + Description */}
            <div>
              <h1 className="mb-6 text-2xl font-bold tracking-tight text-pretty lg:text-5xl">
                Plan. Track. Achieve.
                <span className="text-primary"> Daymatrix</span>
              </h1>
              <p className="mx-auto max-w-3xl text-muted-foreground lg:text-xl">
                A modern, feature-rich calendar app for managing events, tasks,
                and schedules. Enjoy drag & drop, recurring events, real-time
                updates, and beautiful UI views for day, week, and month — all
                powered by a cutting-edge tech stack.
              </p>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-center gap-3">
              <Link href={"/demo"}>
                <Button className="shadow-sm transition-shadow hover:shadow">
                  Live Demo
                </Button>
              </Link>
              <Link
                href={"https://github.com/PriyanshuGupta28/daymatrix"}
                target="_blank"
              >
                <Button variant="outline" className="group">
                  GitHub
                  <ExternalLink className="ml-2 h-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>

            {/* Tech Stack */}
            <div className="mt-20 flex flex-col items-center gap-5">
              <p className="font-medium text-muted-foreground lg:text-left">
                Built with modern web technologies
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {/* React */}
                <a
                  href="https://react.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group flex aspect-square h-12 items-center justify-center p-0"
                  )}
                >
                  <SiReact className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </a>

                {/* TypeScript */}
                <a
                  href="https://www.typescriptlang.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group flex aspect-square h-12 items-center justify-center p-0"
                  )}
                >
                  <SiTypescript className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </a>

                {/* Tailwind CSS */}
                <a
                  href="https://tailwindcss.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group flex aspect-square h-12 items-center justify-center p-0"
                  )}
                >
                  <SiTailwindcss className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </a>

                {/* Next.js */}
                <a
                  href="https://nextjs.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group flex aspect-square h-12 items-center justify-center p-0"
                  )}
                >
                  <SiNextdotjs className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </a>

                {/* shadcn/ui */}
                <a
                  href="https://ui.shadcn.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group flex aspect-square h-12 items-center justify-center p-0"
                  )}
                >
                  <SiShadcnui className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </a>

                {/* FullCalendar */}
                <a
                  href="https://fullcalendar.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "group flex aspect-square h-12 items-center justify-center p-0"
                  )}
                >
                  <FaCalendarDay className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </a>
              </div>
            </div>

            {/* Footer credit */}
            <a href="https://github.com/PriyanshuGupta28" target="_blank">
              <p className="mt-10 text-sm text-muted-foreground">
                Made by <span className="underline">Priyanshu Gupta</span>
              </p>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export { HeroSection };
