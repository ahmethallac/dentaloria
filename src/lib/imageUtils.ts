// Image optimization utilities for better performance

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1200,
  maxHeight: 800,
  quality: 0.8,
  format: 'jpeg'
}

/**
 * Compresses and resizes an image file while maintaining aspect ratio
 */
export const optimizeImage = async (
  file: File, 
  options: ImageOptimizationOptions = {}
): Promise<File> => {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img
      
      if (width > opts.maxWidth) {
        height = (height * opts.maxWidth) / width
        width = opts.maxWidth
      }
      
      if (height > opts.maxHeight) {
        width = (width * opts.maxHeight) / height
        height = opts.maxHeight
      }
      
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: blob.type,
              lastModified: Date.now()
            })
            resolve(optimizedFile)
          }
        },
        `image/${opts.format}`,
        opts.quality
      )
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Optimizes multiple images in parallel
 */
export const optimizeImages = async (
  files: File[],
  options: ImageOptimizationOptions = {}
): Promise<File[]> => {
  return Promise.all(files.map(file => optimizeImage(file, options)))
}

/**
 * Optimizes clinic images with specific settings
 */
export const optimizeClinicImages = (files: File[]): Promise<File[]> => {
  return optimizeImages(files, {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 0.85,
    format: 'jpeg'
  })
}

/**
 * Optimizes doctor profile images with specific settings
 */
export const optimizeDoctorImages = (files: File[]): Promise<File[]> => {
  return optimizeImages(files, {
    maxWidth: 500,
    maxHeight: 500,
    quality: 0.8,
    format: 'jpeg'
  })
}