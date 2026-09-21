def get_optimal_device():
    try:
        import torch_directml
        return torch_directml.device()
    except ImportError:
        pass
    
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
        
    return "cpu"
