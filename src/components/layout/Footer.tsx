"use client";
import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Dribbble,
  Globe,
  Brain,
} from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";

const Footer = () => {
  // Footer link data
  const footerLinks = [
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "#" },
        { label: "Community", href: "#" },
        { label: "Help Center", href: "#" },
        {
          label: "Live Support",
          href: "#",
          pulse: true,
        },
      ],
    },
  ];

  // Contact info data
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-primary" />,
      text: "support@hiresense.ai",
      href: "mailto:support@hiresense.ai",
    },
    {
      icon: <Phone size={18} className="text-primary" />,
      text: "+1 (555) 123-4567",
      href: "tel:+15551234567",
    },
    {
      icon: <MapPin size={18} className="text-primary" />,
      text: "San Francisco, CA",
    },
  ];

  // Social media icons
  const socialLinks = [
    { icon: <Facebook size={20} />, label: "Facebook", href: "#" },
    { icon: <Instagram size={20} />, label: "Instagram", href: "#" },
    { icon: <Twitter size={20} />, label: "Twitter", href: "#" },
    { icon: <Dribbble size={20} />, label: "Dribbble", href: "#" },
    { icon: <Globe size={20} />, label: "Globe", href: "#" },
  ];

  return (
    <footer className="bg-card/30 relative h-fit overflow-hidden border-t border-border/50">
      <div className="max-w-7xl mx-auto p-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground">HireSense AI</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Empowering careers with AI-driven insights, mock interviews, and personalized roadmaps.
              Master your future today.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-foreground text-lg font-semibold mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label} className="relative">
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                    {link.pulse && (
                      <span className="absolute top-0 right-[-10px] w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-foreground text-lg font-semibold mb-6">
              Contact Us
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-sm text-muted-foreground">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-primary transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="hover:text-primary transition-colors cursor-default">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-border/50 my-8" />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0 text-muted-foreground">
          {/* Social icons */}
          <div className="flex space-x-6">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="hover:text-primary transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()} HireSense AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Text hover effect */}
      <div className="lg:flex hidden h-[20rem] items-center justify-center opacity-50 pointer-events-none select-none">
        <TextHoverEffect text="HIRESENSE" className="z-0 opacity-20 dark:opacity-100 dark:text-white " />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
};

export default Footer;
