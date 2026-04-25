import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext';

interface PretextWrapProps {
  text: string;
  className?: string;
  as?: React.ElementType;
  options?: {
    whiteSpace?: 'normal' | 'pre-wrap';
    wordBreak?: 'normal' | 'keep-all';
    letterSpacing?: number;
  };
}

// A component that calculates the tightest width for multi-line text using @chenglou/pretext
export function PretextWrap({ 
  text, 
  className = '',
  as: Component = 'div',
  options = { wordBreak: 'keep-all' }
}: PretextWrapProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [tightWidth, setTightWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    
    const recalculate = () => {
      const parent = el.parentElement;
      if (!parent) return;
      
      const availableW = parent.clientWidth;
      const styles = window.getComputedStyle(el);
      // Construct canvas font string in format: "[font-style] [font-weight] [font-size] [font-family]"
      const fontStr = `${styles.fontStyle} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      
      try {
        const prepared = prepareWithSegments(text, fontStr, options);
        let maxW = 0;
        walkLineRanges(prepared, availableW, (line) => {
          if (line.width > maxW) maxW = line.width;
        });
        
        if (maxW > 0) {
          setTightWidth(Math.ceil(maxW) + 1);
        }
      } catch (err) {
        console.error("Pretext measurement error:", err);
      }
    };
    
    const observer = new ResizeObserver(() => {
      // Small debounce to avoid ResizeObserver loops
      requestAnimationFrame(recalculate);
    });
    
    if (el.parentElement) {
      observer.observe(el.parentElement);
    }
    recalculate();
    
    return () => observer.disconnect();
  }, [text, options.wordBreak, options.whiteSpace, options.letterSpacing]);

  return (
    <Component 
      ref={containerRef} 
      className={className} 
      style={{ maxWidth: tightWidth !== null ? `${tightWidth}px` : '100%', display: 'inline-block' }}
    >
      {text}
    </Component>
  );
}
