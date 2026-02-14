"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SQRT_5000 = Math.sqrt(5000);

export interface Testimonial {
    tempId: number;
    testimonial: string;
    by: string;
    imgSrc: string;
}

interface TestimonialCardProps {
    position: number;
    testimonial: Testimonial;
    handleMove: (steps: number) => void;
    cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
    position,
    testimonial,
    handleMove,
    cardSize
}) => {
    const isCenter = position === 0;

    return (
        <div
            onClick={() => handleMove(position)}
            className={cn(
                "absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out rounded-2xl",
                isCenter
                    ? "z-10 bg-primary text-primary-foreground border-primary"
                    : "z-0 bg-card text-card-foreground border-border hover:border-primary/50"
            )}
            style={{
                width: cardSize,
                height: cardSize,
                // Removed complex clip-path for a cleaner look consistent with modern UI, or kept it if user strictly wants it. 
                // The user said "as per the color palate", but didn't explicitly forbid the shape. 
                // However, the shape in the original code is quite specific (polygon). I'll keep it as it adds unique character 
                // but ensure it fits the theme.
                clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
                transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -20 : position % 2 ? 30 : -30}px)
          rotate(${isCenter ? 0 : position % 2 ? 4 : -4}deg)
          scale(${isCenter ? 1 : 0.9})
        `,
                opacity: Math.abs(position) > 2 ? 0 : 1, // Fade out distant cards
                pointerEvents: Math.abs(position) > 2 ? 'none' : 'auto',
                boxShadow: isCenter ? "0px 8px 0px 4px hsl(var(--border))" : "0px 0px 0px 0px transparent"
            }}
        >
            <span
                className="absolute block origin-top-right rotate-45 bg-border/30"
                style={{
                    right: -2,
                    top: 48,
                    width: SQRT_5000,
                    height: 2
                }}
            />
            <img
                src={testimonial.imgSrc}
                alt={`${testimonial.by.split(',')[0]}`}
                className="mb-4 h-14 w-14 rounded-full bg-muted object-cover border-2 border-background"
                style={{
                    boxShadow: "0px 4px 10px rgba(0,0,0,0.1)"
                }}
            />
            <h3 className={cn(
                "text-lg sm:text-xl font-medium leading-tight mb-4",
                isCenter ? "text-primary-foreground" : "text-foreground"
            )}>
                "{testimonial.testimonial}"
            </h3>
            <p className={cn(
                "absolute bottom-8 left-8 right-8 text-sm font-semibold tracking-wide uppercase",
                isCenter ? "text-primary-foreground/90" : "text-muted-foreground"
            )}>
                - {testimonial.by}
            </p>
        </div>
    );
};

export interface StaggerTestimonialsProps {
    testimonials: Testimonial[];
    autoPlay?: boolean;
    interval?: number;
}

export const StaggerTestimonials: React.FC<StaggerTestimonialsProps> = ({
    testimonials,
    autoPlay = true,
    interval = 3000
}) => {
    const [cardSize, setCardSize] = useState(365);
    const [testimonialsList, setTestimonialsList] = useState(testimonials);
    const [isHovering, setIsHovering] = useState(false);

    const handleMove = useCallback((steps: number) => {
        setTestimonialsList((prevList) => {
            const newList = [...prevList];
            if (steps > 0) {
                for (let i = steps; i > 0; i--) {
                    const item = newList.shift();
                    if (!item) return newList;
                    newList.push({ ...item, tempId: Math.random() });
                }
            } else {
                for (let i = steps; i < 0; i++) {
                    const item = newList.pop();
                    if (!item) return newList;
                    newList.unshift({ ...item, tempId: Math.random() });
                }
            }
            return newList;
        });
    }, []);

    useEffect(() => {
        if (!autoPlay || isHovering) return;

        const timer = setInterval(() => {
            handleMove(1);
        }, interval);

        return () => clearInterval(timer);
    }, [autoPlay, interval, isHovering, handleMove]);

    useEffect(() => {
        const updateSize = () => {
            const { matches } = window.matchMedia("(min-width: 640px)");
            setCardSize(matches ? 365 : 290);
        };

        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    return (
        <div
            className="relative w-full overflow-hidden"
            style={{ height: 600 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                {testimonialsList.map((testimonial, index) => {
                    const position = testimonialsList.length % 2
                        ? index - (testimonialsList.length - 1) / 2
                        : index - testimonialsList.length / 2;

                    // Only render visible cards to improve performance
                    if (Math.abs(position) > 3) return null;

                    return (
                        <TestimonialCard
                            key={testimonial.tempId}
                            testimonial={testimonial}
                            handleMove={handleMove}
                            position={position}
                            cardSize={cardSize}
                        />
                    );
                })}
            </div>

            <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-4 z-20">
                <button
                    onClick={() => handleMove(-1)}
                    className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-300",
                        "bg-background border border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110 shadow-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    aria-label="Previous testimonial"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                    onClick={() => handleMove(1)}
                    className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all duration-300",
                        "bg-background border border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110 shadow-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    aria-label="Next testimonial"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};
