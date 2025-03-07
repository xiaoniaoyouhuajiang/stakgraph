class Admin::WizardController < Admin2Controller
    def index
    end
  
    def new
      cookies.signed[:wizard_step] = params[:step]
  
      # choose image
      if cookies.signed[:wizard_step] == '1'
        render turbo_stream: turbo_stream.replace("wizard_modal", partial: "admin/wizard/choose_image"), content_type: "text/vnd.turbo-stream.html"
        return
      # specify object
      elsif cookies.signed[:wizard_step] == '2'
        render turbo_stream: turbo_stream.replace("wizard_modal", partial: "admin/wizard/specify_object"), content_type: "text/vnd.turbo-stream.html"
        return
      # run job
      elsif cookies.signed[:wizard_step] == '3'
        render turbo_stream: turbo_stream.replace("wizard_modal", partial: "admin/wizard/run_job"), content_type: "text/vnd.turbo-stream.html"
        return
      end
    end
  
    def upload_file
      return unless current_user.customer?
  
      customer = current_user.customer
  
      opts = {
        customer_id: customer.id,
        type: 'wizard',
        key: SecureRandom.uuid
      }
  
      file_uploader = SimpleFileUploader.new(opts)
      file_uploader.store!(params[:file])
  
      render json: {
        media_url: file_uploader.file.url
      }
    end
  
    def create
      unless current_user.customer?
        flash.now[:alert] = "Feature only available to customers"
  
        render turbo_stream: turbo_stream.replace("flash", partial: "admin/shared/flash", locals: { flash: flash }), content_type: "text/vnd.turbo-stream.html"
        return
      end
  
      customer = current_user.customer
  
      opts = {
        customer_id: customer.id,
        type: 'wizard',
        key: SecureRandom.uuid
      }
  
      workflow = find_or_create_default_workflow(customer, project_params[:wizard_object_image])
  
      project = Builders::ProjectBuilder.build do |builder|
        builder.set_params(workflow_id: workflow.id, name: Project::DEFAULT_WIZARD_NAME)
        builder.set_override_params({
          crop_picture: {
            params: {
              prioritize: true,
              media_url: project_params[:wizard_object_image]
            },
            attributes: {
              label: "Draw a box around the #{project_params[:wizard_object_text]}"
            }
          }
        }.to_json)
        builder.set_customer(customer)
      end
      project.current_transition = 0
      project.workflow_state = :new
      project.save!
  
      WorkflowRunnerWorker.perform_async(project.id)
  
      skill = Skill.find_by(name: 'polygon')
      # skill_maps = SkillMap.control_jobs_passed(skill)
      skill_maps = SkillMap.where(skill_id: skill.id, status: :active)
  
      online_activity = Account.online_activity
  
      workers_notified = skill_maps.length
      workers_online = online_activity[:accounts_online].length
  
      render turbo_stream: turbo_stream.replace("wizard_modal", partial: "admin/wizard/run_job", locals: { workers_notified: workers_notified, workers_online: workers_online }),
        content_type: "text/vnd.turbo-stream.html"
    end
  
    private
  
    def find_or_create_default_workflow(customer, job_image)
      workflow = Workflow.find_by(name: Project::DEFAULT_WIZARD_NAME, customer_id: customer.id)
      return workflow if workflow.present?
  
      pricing_policy = find_or_create_default_policy(customer)
  
      spec = {
        transitions: [
          {
            name: 'Polygon',
            id: 'crop_picture',
            unique_id: SecureRandom.uuid,
            subskill_id: nil,
            params: {
              customer_key: "wizard_crop",
              media_url: job_image,
              min_confirmations: 1,
              job_count: 1,
              job_max: 1,
              pricing_policy_id: pricing_policy.id
            },
            attributes: {
              label: 'Polygon',
              zoom_scale: 1.5,
              line_count: 4
            }
          }
        ],
        version: 1
      }
      Workflow.create(name: Project::DEFAULT_WIZARD_NAME, customer_id: customer.id, spec: spec)
    end
  
    def find_or_create_default_policy(customer)
      pricing_policy = PricingPolicy.find_by(name: Project::DEFAULT_WIZARD_NAME, customer_id: customer.id)
      return pricing_policy if pricing_policy.present?
  
      PricingPolicy.create(name: Project::DEFAULT_WIZARD_NAME,
                           customer_id: customer.id,
                           penalty_fixed: 0,
                           reward_fixed: 0,
                           amount: 50)
    end
  
    def project_params
      params.permit(:wizard_object_image, :wizard_object_text)
    end
  end
  