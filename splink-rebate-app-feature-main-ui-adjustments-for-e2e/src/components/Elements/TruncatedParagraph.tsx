import infoIcon from "@/assets/icons/info.svg";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

interface TruncatedParagraphProps {
  content: string;
  lineClamp?: number; // Number of lines to show before truncating
}

const TruncatedParagraph: React.FC<TruncatedParagraphProps> = ({
  content,
  lineClamp = 2
}) => {
  const [isTruncated, setIsTruncated] = useState<boolean>(false);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const paragraphRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (paragraphRef.current) {
      const element = paragraphRef.current;
      const hasOverflow =
        element.scrollHeight > element.clientHeight ||
        element.scrollWidth > element.clientWidth;
      setIsTruncated(hasOverflow);
    }
  }, [content, lineClamp]);

  const handleMouseEnter = () => {
    if (paragraphRef.current) {
      const rect = paragraphRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom,
        left: rect.left + rect.width / 2
      });
    }
    setShowPopover(true);
  };

  return (
    <div className="relative group">
      <span
        ref={paragraphRef}
        className="font-medium text-xs text-heading-light overflow-hidden whitespace-pre-line relative"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: lineClamp,
          WebkitBoxOrient: "vertical"
        }}
      >
        {content}
      </span>

      {/* Add a custom "..." only when content is truncated */}
      {isTruncated && (
        <span
          className="absolute bottom-0 right-0 cursor-pointer text-xs text-gray-500 bg-white pl-1.5"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setShowPopover(false)}
        >
          <Image
            src={infoIcon.src}
            height={16}
            width={16}
            alt="Info Icon"
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
          {showPopover && (
            <div
              className="fixed z-10 w-64 p-2 bg-white border rounded shadow-lg"
              style={{
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                transform: "translateX(-50%)"
              }}
            >
              <p className="text-xs text-gray-800">{content}</p>
            </div>
          )}
        </span>
      )}
    </div>
  );
};

export default TruncatedParagraph;
