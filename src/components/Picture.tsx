import React from "react";

type PictureProps = {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  style?: React.CSSProperties;
};

export default function Picture({
  src,
  alt,
  className,
  eager = false,
  style,
}: PictureProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
    />
  );
}


