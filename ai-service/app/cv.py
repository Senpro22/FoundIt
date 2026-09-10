"""
Computer Vision similarity module.

MVP implementation: uses perceptual image hashing (average hash) to compare
two images and produce a similarity score between 0 and 1.

This is intentionally lightweight (no model download, fast in CI). It can
later be swapped for a pretrained embedding model such as CLIP or ResNet
for better accuracy on real photos -- the function signature below
(image_similarity) is the only thing the rest of the app depends on, so
swapping the implementation later won't require changing main.py.
"""

from PIL import Image
import imagehash


def compute_image_hash(image: Image.Image) -> imagehash.ImageHash:
    """Compute a perceptual average hash for an image."""
    return imagehash.average_hash(image)


def image_similarity(img1: Image.Image, img2: Image.Image) -> float:
    """
    Compare two images and return a similarity score in [0, 1].

    1.0 means identical (or visually indistinguishable) images,
    0.0 means completely different images.
    """
    hash1 = compute_image_hash(img1)
    hash2 = compute_image_hash(img2)

    hamming_distance = hash1 - hash2
    max_distance = len(hash1.hash) ** 2  # e.g. 8x8 hash -> 64 bits

    similarity = 1 - (hamming_distance / max_distance)
    return round(max(0.0, min(1.0, similarity)), 4)
