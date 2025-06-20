"use client";

import { useState, useEffect, useCallback } from 'react';

interface LottieColor {
  r: number;
  g: number;
  b: number;
  a?: number; // Alpha is usually 1 for solid colors in Lottie, but good to have
}

const parseCssColorToLottieFormat = (cssColorVar: string): [number, number, number, number] | null => {
  if (typeof window === "undefined" || !cssColorVar) return null;

  try {
    const colorValue = getComputedStyle(document.documentElement).getPropertyValue(cssColorVar).trim();
    if (!colorValue || colorValue === "initial" || colorValue === "") {
      console.warn(`[LottieThemer] CSS Var ${cssColorVar} is empty or not found.`);
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = colorValue;
      ctx.fillRect(0, 0, 1, 1);
      const pixelData = ctx.getImageData(0, 0, 1, 1).data;
      return [pixelData[0] / 255, pixelData[1] / 255, pixelData[2] / 255, pixelData[3] / 255];
    } else {
      console.warn(`[LottieThemer] Could not get 2D context for ${cssColorVar}.`);
      return null;
    }
  } catch (e) {
    console.error(`[LottieThemer] Error getting/parsing CSS var ${cssColorVar}:`, e instanceof Error ? e.message : String(e));
    return null;
  }
};

export const useLottieThemer = (originalLottieJson: any) => {
  const [lottieAnimationData, setLottieAnimationData] = useState<any>(originalLottieJson);

  const updateLottieTheme = useCallback(() => {
    console.log("[LottieThemer] Attempting to update Lottie theme...");
    const semanticPrimaryLottieColor = parseCssColorToLottieFormat('--color-primary');
    const semanticSecondaryLottieColor = parseCssColorToLottieFormat('--color-secondary');

    if (!semanticPrimaryLottieColor && !semanticSecondaryLottieColor) {
      console.warn("[LottieThemer] Both semantic colors are null. Skipping Lottie update.");
      setLottieAnimationData(originalLottieJson); // Reset to original if colors can't be parsed
      return;
    }

    const newLottieData = JSON.parse(JSON.stringify(originalLottieJson));
    const targetPrimaryR = 1;
    const targetPrimaryG = 0.247058823705;
    const targetPrimaryB = 0.06274510175;
    const targetSecondaryR = 0.180392161012;
    const targetSecondaryG = 0.858823597431;
    const targetSecondaryB = 0.533333361149;
    const tolerance = 0.01;
    let colorsReplacedCount = 0;

    function updateColorsRecursively(obj: any) {
      if (typeof obj !== 'object' || obj === null) return;
      if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c && obj.c.a === 0 && obj.c.k) {
        const colorArray = obj.c.k;
        if (Array.isArray(colorArray) && colorArray.length === 4) {
          if (semanticPrimaryLottieColor && Math.abs(colorArray[0] - targetPrimaryR) < tolerance && Math.abs(colorArray[1] - targetPrimaryG) < tolerance && Math.abs(colorArray[2] - targetPrimaryB) < tolerance) {
            obj.c.k = [...semanticPrimaryLottieColor];
            colorsReplacedCount++;
          } else if (semanticSecondaryLottieColor && Math.abs(colorArray[0] - targetSecondaryR) < tolerance && Math.abs(colorArray[1] - targetSecondaryG) < tolerance && Math.abs(colorArray[2] - targetSecondaryB) < tolerance) {
            obj.c.k = [...semanticSecondaryLottieColor];
            colorsReplacedCount++;
          }
        }
      }
      Object.keys(obj).forEach(key => updateColorsRecursively(obj[key]));
    }

    updateColorsRecursively(newLottieData);
    console.log("[LottieThemer] Total colors replaced:", colorsReplacedCount);
    setLottieAnimationData(colorsReplacedCount > 0 ? newLottieData : originalLottieJson);
  }, [originalLottieJson]);

  useEffect(() => {
    const handleThemeApplied = () => {
      console.log("[LottieThemer] 'themeApplied' event received.");
      updateLottieTheme();
    };

    document.documentElement.addEventListener('themeApplied', handleThemeApplied);
    if (document.documentElement.getAttribute('data-initial-theme-applied') === 'true') {
      updateLottieTheme();
    }
    return () => document.documentElement.removeEventListener('themeApplied', handleThemeApplied);
  }, [updateLottieTheme]);

  return lottieAnimationData;
};