import React from "react";

const Footer = () => {
  const currentYear: number = new Date().getFullYear();

  return (
    <footer className="py-4 bg-white">
      <div className="container mx-auto text-center">
        <p className="text-sm text-heading-light">
          &copy; {currentYear} Splink. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
