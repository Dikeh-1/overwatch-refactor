import math
import random
from PIL import Image, ImageDraw

def generate_confetti_gif(output_path, width=600, height=260, num_frames=60, fps=30):
    random.seed(42)
    
    # 150 abundant, varied confetti particles
    # Types: "ribbon", "rect", "circle", "star"
    colors = [
        (255, 215, 0),    # Metallic Gold
        (245, 158, 11),   # Amber
        (2, 132, 199),    # Overwatch Sky Blue
        (56, 189, 248),   # Light Cyan
        (16, 185, 129),   # Emerald Green
        (239, 68, 68),    # Crimson Red
        (244, 63, 94),    # Rose Pink
        (139, 92, 246),   # Royal Violet
        (217, 70, 239),   # Fuchsia
        (11, 19, 41),     # Brand Navy
    ]
    
    particles = []
    num_particles = 180
    
    for i in range(num_particles):
        p_type = random.choice(["ribbon", "rect", "rect", "circle", "circle"])
        color = random.choice(colors)
        x_base = random.uniform(20, width - 20)
        y_start = random.uniform(-height, 0)
        speed = random.uniform(3.5, 7.0)
        w = random.uniform(8, 16)
        h = random.uniform(5, 11)
        rot_speed = random.uniform(0.08, 0.22)
        phase = random.uniform(0, math.pi * 2)
        sway_amp = random.uniform(15, 35)
        sway_freq = random.uniform(0.03, 0.08)
        
        particles.append({
            "type": p_type,
            "color": color,
            "x_base": x_base,
            "y_start": y_start,
            "speed": speed,
            "w": w,
            "h": h,
            "rot_speed": rot_speed,
            "phase": phase,
            "sway_amp": sway_amp,
            "sway_freq": sway_freq,
        })
        
    frames = []
    total_travel = height * 2
    
    for f in range(num_frames):
        # White background matching email letterhead
        img = Image.new("RGBA", (width, height), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        
        # Sort particles for depth
        for p in particles:
            # Loop seamlessly:
            progress = (f / num_frames)
            dist = (progress * total_travel * (p["speed"] / 4.0)) % (height + 60)
            y = (p["y_start"] + dist) % (height + 50) - 20
            x = p["x_base"] + math.sin(f * p["sway_freq"] + p["phase"]) * p["sway_amp"]
            
            # 3D spin oscillation
            spin = math.cos(f * p["rot_speed"] + p["phase"])
            cur_w = max(1.5, abs(p["w"] * spin))
            cur_h = p["h"]
            
            # Slight color shading for 3D flip effect
            c = p["color"]
            if spin < 0:
                c = (max(0, int(c[0] * 0.75)), max(0, int(c[1] * 0.75)), max(0, int(c[2] * 0.75)))
                
            angle = (f * p["rot_speed"] * 45 + p["phase"] * 50) % 360
            
            if p["type"] == "circle":
                r = cur_w / 2
                draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
            elif p["type"] == "rect":
                # Draw oriented tumbling rectangle
                rad = math.radians(angle)
                cos_a = math.cos(rad)
                sin_a = math.sin(rad)
                hw = cur_w / 2
                hh = cur_h / 2
                
                pts = [
                    (x - hw * cos_a + hh * sin_a, y - hw * sin_a - hh * cos_a),
                    (x + hw * cos_a + hh * sin_a, y + hw * sin_a - hh * cos_a),
                    (x + hw * cos_a - hh * sin_a, y + hw * sin_a + hh * cos_a),
                    (x - hw * cos_a - hh * sin_a, y - hw * sin_a + hh * cos_a),
                ]
                draw.polygon(pts, fill=c)
            elif p["type"] == "ribbon":
                # Draw a curved ribbon streamer segment
                rad = math.radians(angle)
                hw = cur_w * 0.8
                hh = cur_h * 1.6
                draw.line([(x - hw, y - hh), (x, y), (x + hw, y + hh)], fill=c, width=3)
                
        # Draw celebration popper icon burst at bottom corners (neat and small, not huge)
        # Left popper
        draw.polygon([(10, height - 10), (35, height - 15), (20, height - 40)], fill=(245, 158, 11))
        draw.polygon([(18, height - 25), (27, height - 27), (20, height - 40)], fill=(217, 70, 239))
        
        # Right popper
        draw.polygon([(width - 10, height - 10), (width - 35, height - 15), (width - 20, height - 40)], fill=(2, 132, 199))
        draw.polygon([(width - 18, height - 25), (width - 27, height - 27), (width - 20, height - 40)], fill=(255, 215, 0))

        # Flatten on crisp white background for email client compatibility
        bg = Image.new("RGB", (width, height), (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        frames.append(bg)
        
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=int(1000 / fps),
        loop=0,
        optimize=True
    )
    print(f"Saved {output_path} with {len(frames)} frames.")

if __name__ == "__main__":
    import os
    os.makedirs("public/animations", exist_ok=True)
    generate_confetti_gif("public/animations/confetti-celebration.gif")
    generate_confetti_gif("public/animations/confetti.gif")
