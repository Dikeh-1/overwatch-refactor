import math
import random
from PIL import Image, ImageDraw

def generate_photorealistic_confetti_gif(output_path, width=600, height=280, num_frames=60, fps=30):
    random.seed(42)
    
    # Load the authentic golden party popper horn sprite
    left_horn = Image.open("scripts/horn_clean.png").convert("RGBA")
    horn_w = int(left_horn.width * 1.15)
    horn_h = int(left_horn.height * 1.15)
    left_horn = left_horn.resize((horn_w, horn_h), Image.Resampling.LANCZOS)
    right_horn = left_horn.transpose(Image.FLIP_LEFT_RIGHT)
    
    # Horn mouth centers for emission
    left_mouth = (12 + int(horn_w * 0.68), height - int(horn_h * 0.72))
    right_mouth = (width - 12 - int(horn_w * 0.68), height - int(horn_h * 0.72))
    
    # Vibrant celebratory colors exactly matching the admin overlay screenshot
    colors = [
        (255, 215, 0),    # Metallic Gold
        (245, 158, 11),   # Amber Yellow
        (2, 132, 199),    # Overwatch Sky Blue
        (56, 189, 248),   # Electric Cyan
        (16, 185, 129),   # Emerald Green
        (52, 211, 153),   # Mint Light Green
        (239, 68, 68),    # Crimson Red
        (244, 63, 94),    # Hot Magenta Pink
        (168, 85, 247),   # Royal Violet
        (217, 70, 239),   # Fuchsia
        (255, 255, 255),  # Sparkle White
        (251, 146, 60),   # Bright Orange
    ]
    
    particles = []
    
    # 1. Left Corner Popper Explosive Fountain (85 particles fanning up & right)
    for _ in range(85):
        color = random.choice(colors)
        p_type = random.choice(["rect", "rect", "square", "circle", "ribbon"])
        # Angle fanning across 15 to 80 degrees above horizontal to the right
        angle_rad = random.uniform(math.radians(-80), math.radians(-18))
        speed = random.uniform(5.5, 12.0)
        w = random.uniform(8, 15)
        h = random.uniform(5, 10)
        particles.append({
            "emitter": "left",
            "type": p_type,
            "color": color,
            "ox": left_mouth[0],
            "oy": left_mouth[1],
            "vx": math.cos(angle_rad) * speed,
            "vy": math.sin(angle_rad) * speed,
            "w": w,
            "h": h,
            "phase": random.uniform(0, math.pi * 2),
            "rot_speed": random.uniform(0.12, 0.30),
            "sway_freq": random.uniform(0.04, 0.08),
            "sway_amp": random.uniform(12, 28),
            "gravity": random.uniform(0.14, 0.22),
            "birth_frame": random.uniform(0, num_frames),
        })
        
    # 2. Right Corner Popper Explosive Fountain (85 particles fanning up & left)
    for _ in range(85):
        color = random.choice(colors)
        p_type = random.choice(["rect", "rect", "square", "circle", "ribbon"])
        # Angle fanning across 100 to 165 degrees above horizontal to the left
        angle_rad = random.uniform(math.radians(-162), math.radians(-100))
        speed = random.uniform(5.5, 12.0)
        w = random.uniform(8, 15)
        h = random.uniform(5, 10)
        particles.append({
            "emitter": "right",
            "type": p_type,
            "color": color,
            "ox": right_mouth[0],
            "oy": right_mouth[1],
            "vx": math.cos(angle_rad) * speed,
            "vy": math.sin(angle_rad) * speed,
            "w": w,
            "h": h,
            "phase": random.uniform(0, math.pi * 2),
            "rot_speed": random.uniform(0.12, 0.30),
            "sway_freq": random.uniform(0.04, 0.08),
            "sway_amp": random.uniform(12, 28),
            "gravity": random.uniform(0.14, 0.22),
            "birth_frame": random.uniform(0, num_frames),
        })
        
    # 3. Ambient Continuous Confetti Rain across Center & Canopy (110 particles)
    for _ in range(110):
        color = random.choice(colors)
        p_type = random.choice(["rect", "rect", "square", "circle", "ribbon"])
        x_base = random.uniform(30, width - 30)
        y_start = random.uniform(-height, 0)
        speed = random.uniform(3.0, 6.0)
        w = random.uniform(8, 14)
        h = random.uniform(5, 10)
        particles.append({
            "emitter": "ambient",
            "type": p_type,
            "color": color,
            "x_base": x_base,
            "y_start": y_start,
            "speed": speed,
            "w": w,
            "h": h,
            "phase": random.uniform(0, math.pi * 2),
            "rot_speed": random.uniform(0.10, 0.25),
            "sway_freq": random.uniform(0.03, 0.07),
            "sway_amp": random.uniform(14, 30),
        })
        
    frames = []
    
    # Deep brand navy background matching screenshot backdrop
    bg_color = (9, 13, 22) # #090d16
    
    for f in range(num_frames):
        frame = Image.new("RGBA", (width, height), bg_color)
        draw = ImageDraw.Draw(frame)
        
        # Render confetti
        for p in particles:
            if p["emitter"] in ("left", "right"):
                # Burst physics looping smoothly across 60 frames
                age = (f - p["birth_frame"]) % num_frames
                if age < 0:
                    age += num_frames
                    
                t = age * 0.75
                drag = math.exp(-0.025 * t)
                x = p["ox"] + p["vx"] * t * drag + math.sin(f * p["sway_freq"] + p["phase"]) * (p["sway_amp"] * (age / num_frames))
                y = p["oy"] + p["vy"] * t * drag + 0.5 * p["gravity"] * (t ** 2) * 1.4
                
                if y > height + 20 or x < -30 or x > width + 30:
                    continue
            else:
                progress = (f / num_frames)
                dist = (progress * height * 2.6 * (p["speed"] / 4.0)) % (height + 60)
                y = (p["y_start"] + dist) % (height + 50) - 20
                x = p["x_base"] + math.sin(f * p["sway_freq"] + p["phase"]) * p["sway_amp"]
                
            # 3D spin oscillation
            spin = math.cos(f * p["rot_speed"] + p["phase"])
            cur_w = max(2.5, abs(p["w"] * spin))
            cur_h = p["h"]
            angle = (f * p["rot_speed"] * 55 + p["phase"] * 70) % 360
            
            c = p["color"]
            if spin < 0:
                c = (max(0, int(c[0] * 0.8)), max(0, int(c[1] * 0.8)), max(0, int(c[2] * 0.8)))
                
            rad = math.radians(angle)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)
            
            if p["type"] == "circle":
                r = cur_w / 2
                draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
            elif p["type"] == "ribbon":
                # Curving ribbon with orientation
                hw = cur_w * 0.9
                hh = cur_h * 1.5
                p1 = (x - hw * cos_a, y - hh * sin_a)
                p2 = (x, y)
                p3 = (x + hw * cos_a, y + hh * sin_a)
                draw.line([p1, p2, p3], fill=c, width=3)
            else:
                # 3D tumbling rectangular confetti
                hw = cur_w / 2
                hh = cur_h / 2
                pts = [
                    (x - hw * cos_a + hh * sin_a, y - hw * sin_a - hh * cos_a),
                    (x + hw * cos_a + hh * sin_a, y + hw * sin_a - hh * cos_a),
                    (x + hw * cos_a - hh * sin_a, y + hw * sin_a + hh * cos_a),
                    (x - hw * cos_a - hh * sin_a, y - hw * sin_a + hh * cos_a),
                ]
                draw.polygon(pts, fill=c)
                
        # Paste corner party poppers right on top of emissions
        frame.paste(left_horn, (8, height - horn_h - 4), left_horn)
        frame.paste(right_horn, (width - horn_w - 8, height - horn_h - 4), right_horn)
        
        rgb_frame = frame.convert("RGB")
        frames.append(rgb_frame)
        
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=int(1000 / fps),
        loop=0,
        optimize=True
    )
    print(f"Generated {output_path} with {len(frames)} frames!")

if __name__ == "__main__":
    generate_photorealistic_confetti_gif("public/animations/confetti-celebration.gif")
    generate_photorealistic_confetti_gif("public/animations/confetti.gif")
