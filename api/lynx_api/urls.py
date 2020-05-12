from django.urls import path
from . import views

urlpatterns = [
    path('specs/', views.Specs.as_view()),
    path('access-token/', views.AuthenticationToken.as_view()),
    path('execute-workflow/', views.ExecuteWorkflow.as_view()),
    path('status/', views.WorkflowStatus.as_view()),
    path('complete-iteration/', views.CompleteIteration.as_view()),
    path('list-jobs/', views.ListJobs.as_view()),
    path('save-model/', views.SaveModel.as_view()),
    path('apply-model/', views.ApplyModel.as_view()),
    path('delete-job/', views.DeleteJob.as_view())
]
