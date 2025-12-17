from django.shortcuts import render

def index(request):
    """Render the main gesture particle system page."""
    return render(request, 'core/index.html')
